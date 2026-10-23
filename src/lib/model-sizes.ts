/** Published byte sizes for pinned model weights, keyed by their download filename. */
export const MODEL_DOWNLOAD_BYTES: Record<string, number> = {
  'yolo26n_pose_384_xnnpack_int8.pte': 7_005_316,
  'yolo26n_pose_384_xnnpack_fp32.pte': 11_917_828,
  'yolo26n_pose_384_coreml_fp16.pte': 6_769_863,
  'yolo26n_pose_384_vulkan_fp16.pte': 6_048_644,
  'yolo26_seg_n_384_xnnpack_int8.pte': 4_020_480,
  'yolo26_seg_n_384_xnnpack_fp32.pte': 11_112_448,
  'yolo26_seg_n_384_coreml_fp16.pte': 6_393_371,
  'yolo26_seg_n_384_vulkan_fp16.pte': 5_651_072,
  'deeplab_v3_resnet50_coreml_fp16.pte': 79_613_357,
  'deeplab_v3_resnet50_xnnpack_int8.pte': 42_379_092,
  'deeplab_v3_resnet50_xnnpack_fp32.pte': 158_505_428,
  'ssdlite320_mobilenet_v3_large_coreml_fp16.pte': 8_457_606,
  'ssdlite320_mobilenet_v3_large_xnnpack_fp32.pte': 13_896_712,
};
