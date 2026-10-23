/** Published byte sizes for pinned model weights, keyed by their download filename. */
export const MODEL_DOWNLOAD_BYTES: Record<string, number> = {
  'deeplab_v3_resnet50_coreml_fp16.pte': 79_613_357,
  'deeplab_v3_resnet50_xnnpack_int8.pte': 42_379_092,
  'deeplab_v3_resnet50_xnnpack_fp32.pte': 158_505_428,
  'ssdlite320_mobilenet_v3_large_coreml_fp16.pte': 8_457_606,
  'ssdlite320_mobilenet_v3_large_xnnpack_fp32.pte': 13_896_712,
};
