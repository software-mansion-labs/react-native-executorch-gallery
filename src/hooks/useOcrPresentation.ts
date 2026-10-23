import { useMemo, useState } from 'react';
import type { OcrDetection } from 'react-native-executorch';

/**
 * Keeps the OCR sheet and selected region in sync with the current recognition results.
 * Returns reading-order text and sheet actions; replacing results clears selection and closes the sheet.
 */
export function useOcrPresentation(results: OcrDetection[] | null) {
  const [sheet, setSheet] = useState({
    source: results,
    visible: false,
    selectedIndex: null as number | null,
  });
  if (sheet.source !== results) setSheet({ source: results, visible: false, selectedIndex: null });
  const current = sheet.source === results ? sheet : { visible: false, selectedIndex: null };
  const text = useMemo(() => results?.map((line) => line.text).join('\n') ?? '', [results]);
  const open = (selectedIndex: number | null = null) => {
    if (!results?.length) return;
    setSheet({ source: results, visible: true, selectedIndex });
  };
  const close = () => setSheet({ source: results, visible: false, selectedIndex: null });
  return {
    results,
    text,
    visible: current.visible,
    selectedIndex: current.selectedIndex,
    open,
    close,
  };
}

export type OcrPresentation = ReturnType<typeof useOcrPresentation>;
