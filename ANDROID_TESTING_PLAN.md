# Android .tflite Testing Plan

## Objective
Verify the integration, performance, and security of the `face_landmark_68_model.tflite` (and related `.tflite` models) on physical Android devices.

## Requirements
- Target Devices: Low-end (e.g., Android Go), Mid-range, and Flagship Android devices to test hardware constraints.
- OS Versions: Android 11 to 14.

## Core Scenarios

### 1. Enrollment Verification
- Ensure that an optimal face scan creates an accurate 68-point feature map.
- Test under variable lighting conditions (harsh backlighting, low light).
- Output: Confidence score logs must exceed the minimum threshold (e.g., >85%).

### 2. Matching / Acceptance Tests
- Authenticate a successfully enrolled face.
- Response time should be < 2 seconds on mid-range hardware. 

### 3. Rejection / Spoof Testing
- **Photo Attack**: Attempt authentication using a high-res photo displayed on another screen.
- **Similar Faces**: Test with siblings or similar-looking individuals to evaluate the model's false-acceptance rate.
- **Hardware Variation**: Ensure camera distortion (e.g., fish-eye on some cheap webcams/front cameras) doesn't cause a bypass.

### 4. Edge Cases
- Changes in facial hair, glasses (clear vs sunglasses), and face masks. 

## Next Steps
- Incorporate testing scripts into a CI/CD pipeline (using Firebase Test Lab for Android).
- Review false-acceptance and false-rejection rates before full production rollout.
