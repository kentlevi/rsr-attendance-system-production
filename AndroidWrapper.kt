package com.rsrengineering.kiosk

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.sqrt

private const val FACE_MATCH_THRESHOLD = 0.95f

@Entity(tableName = "employees")
data class EmployeeRecord(
    @PrimaryKey val empCode: String,
    val name: String,
    val department: String,
    val siteId: String,
    val phone: String,
    val active: Boolean = true,
    @androidx.room.ColumnInfo(name = "face_embedding", typeAffinity = androidx.room.ColumnInfo.BLOB)
    val faceEmbedding: ByteArray? = null,
    val synced: Boolean = false
)

@Entity(tableName = "punches")
data class PunchRecord(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val empCode: String,
    val type: String,
    val timestamp: String,
    val siteId: String,
    val synced: Boolean = false
)

@Dao
interface EmployeeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertEmployee(employee: EmployeeRecord)

    @Query("UPDATE employees SET face_embedding = :embedding, synced = 0 WHERE empCode = :empCode")
    fun updateFaceEmbedding(empCode: String, embedding: ByteArray)

    @Query("SELECT * FROM employees WHERE active = 1 AND face_embedding IS NOT NULL")
    fun getEmployeesWithFaceEmbeddings(): List<EmployeeRecord>

    @Query("SELECT * FROM employees WHERE empCode = :empCode LIMIT 1")
    fun getEmployee(empCode: String): EmployeeRecord?
}

@Dao
interface PunchDao {
    @Insert
    fun insertPunch(punch: PunchRecord)

    @Query("SELECT * FROM punches WHERE synced = 0")
    fun getUnsyncedPunches(): List<PunchRecord>

    @Query("UPDATE punches SET synced = 1 WHERE id = :id")
    fun markSynced(id: Int)
}

@Database(entities = [EmployeeRecord::class, PunchRecord::class], version = 2)
abstract class KioskDatabase : RoomDatabase() {
    abstract fun employeeDao(): EmployeeDao
    abstract fun punchDao(): PunchDao
}

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    lateinit var db: KioskDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        db = Room.databaseBuilder(applicationContext, KioskDatabase::class.java, "kiosk-offline-db")
            .fallbackToDestructiveMigration()
            .build()

        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(WebAppInterface(this, db), "Android")

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 1)
        }

        webView.loadUrl("https://rsr-engineering.app/")
    }
}

class WebAppInterface(private val context: MainActivity, private val db: KioskDatabase) {
    private val embeddingModel = FaceEmbeddingModel(context)

    @JavascriptInterface
    fun identifyFaceFromScan(base64Image: String): String? {
        return try {
            val bitmap = decodeBase64Image(base64Image) ?: return null
            if (!isLiveFace(bitmap)) return null

            val probeEmbedding = embeddingModel.extractEmbedding(bitmap)
            val candidates = db.employeeDao().getEmployeesWithFaceEmbeddings()
            var bestEmployee: EmployeeRecord? = null
            var bestScore = 0f

            for (candidate in candidates) {
                val storedEmbedding = candidate.faceEmbedding?.toFloatArrayEmbedding() ?: continue
                val score = cosineSimilarity(probeEmbedding, storedEmbedding)
                if (score > bestScore) {
                    bestScore = score
                    bestEmployee = candidate
                }
            }

            if (bestEmployee != null && bestScore >= FACE_MATCH_THRESHOLD) {
                bestEmployee!!.empCode
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    @JavascriptInterface
    fun enrollEmployeeFace(empCode: String, base64Image: String): Boolean {
        return try {
            val bitmap = decodeBase64Image(base64Image) ?: return false
            if (!isLiveFace(bitmap)) return false
            val embedding = embeddingModel.extractEmbedding(bitmap).toByteArrayEmbedding()
            db.employeeDao().updateFaceEmbedding(empCode, embedding)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun saveEmployee(employeeJson: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val json = JSONObject(employeeJson)
            val empCode = json.optString("empCode")
            if (empCode.isBlank()) return@launch

            db.employeeDao().upsertEmployee(
                EmployeeRecord(
                    empCode = empCode,
                    name = json.optString("name"),
                    department = json.optString("department"),
                    siteId = json.optString("site", "A"),
                    phone = json.optString("phone"),
                    active = json.optBoolean("active", true),
                    faceEmbedding = null,
                    synced = false
                )
            )
        }
    }

    @JavascriptInterface
    fun checkLiveness(base64Image: String): Boolean {
        val bitmap = decodeBase64Image(base64Image) ?: return false
        return isLiveFace(bitmap)
    }

    @JavascriptInterface
    fun savePunchOffline(empCode: String, type: String, timestamp: String, siteId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            db.punchDao().insertPunch(
                PunchRecord(empCode = empCode, type = type, timestamp = timestamp, siteId = siteId, synced = false)
            )
        }
    }

    @JavascriptInterface
    fun saveRefPhoto(empCode: String, base64Data: String) {
        enrollEmployeeFace(empCode, base64Data)
    }

    @JavascriptInterface
    fun getRefPhoto(empCode: String): String {
        return ""
    }

    @JavascriptInterface
    fun saveFile(filename: String, content: String, mimeType: String) {
        // Save export CSV reports.
    }

    @JavascriptInterface
    fun getUnsyncedPunches(): String {
        return try {
            val punches = db.punchDao().getUnsyncedPunches()
            val jsArray = org.json.JSONArray()
            punches.forEach { punch ->
                val obj = org.json.JSONObject()
                obj.put("id", punch.id)
                obj.put("empCode", punch.empCode)
                obj.put("type", punch.type)
                obj.put("timestamp", punch.timestamp)
                obj.put("siteId", punch.siteId)
                jsArray.put(obj)
            }
            jsArray.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    @JavascriptInterface
    fun markPunchSynced(id: Int) {
        CoroutineScope(Dispatchers.IO).launch {
            db.punchDao().markSynced(id)
        }
    }

    private fun isLiveFace(bitmap: Bitmap): Boolean {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .build()

        val image = InputImage.fromBitmap(bitmap, 0)
        val faces = Tasks.await(FaceDetection.getClient(options).process(image))
        if (faces.isEmpty()) return false

        val face = faces[0]
        return (face.leftEyeOpenProbability ?: 0f) > 0.4f &&
            (face.rightEyeOpenProbability ?: 0f) > 0.4f &&
            abs(face.headEulerAngleY) < 20f
    }

    private fun decodeBase64Image(base64Image: String): Bitmap? {
        val decodedBytes = Base64.decode(base64Image.substringAfter(","), Base64.DEFAULT)
        return android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
    }

    private fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
        if (a.size != b.size) return 0f
        var dot = 0f
        var normA = 0f
        var normB = 0f
        for (i in a.indices) {
            dot += a[i] * b[i]
            normA += a[i] * a[i]
            normB += b[i] * b[i]
        }
        if (normA == 0f || normB == 0f) return 0f
        return dot / (sqrt(normA) * sqrt(normB))
    }
}

/**
 * Replace this helper with a real on-device embedding model such as MobileFaceNet/FaceNet TFLite.
 * ML Kit detects faces and liveness signals, but it does not produce identity embeddings.
 */
class FaceEmbeddingModel(private val context: MainActivity) {
    fun extractEmbedding(bitmap: Bitmap): FloatArray {
        // TODO: Load assets/mobile_face_net.tflite and return its normalized embedding vector.
        // This placeholder keeps the bridge contract stable while the model asset is added.
        val resized = Bitmap.createScaledBitmap(bitmap, 16, 16, true)
        val embedding = FloatArray(192)
        var cursor = 0
        for (y in 0 until resized.height) {
            for (x in 0 until resized.width) {
                if (cursor >= embedding.size) break
                val pixel = resized.getPixel(x, y)
                val r = (pixel shr 16 and 0xff) / 255f
                val g = (pixel shr 8 and 0xff) / 255f
                val b = (pixel and 0xff) / 255f
                embedding[cursor++] = (r + g + b) / 3f
            }
        }
        return l2Normalize(embedding)
    }

    private fun l2Normalize(values: FloatArray): FloatArray {
        var norm = 0f
        values.forEach { norm += it * it }
        norm = sqrt(norm)
        if (norm == 0f) return values
        return values.map { it / norm }.toFloatArray()
    }
}

private fun FloatArray.toByteArrayEmbedding(): ByteArray {
    val buffer = ByteBuffer.allocate(size * 4).order(ByteOrder.LITTLE_ENDIAN)
    forEach { buffer.putFloat(it) }
    return buffer.array()
}

private fun ByteArray.toFloatArrayEmbedding(): FloatArray {
    val buffer = ByteBuffer.wrap(this).order(ByteOrder.LITTLE_ENDIAN)
    val floats = FloatArray(size / 4)
    for (i in floats.indices) floats[i] = buffer.float
    return floats
}
