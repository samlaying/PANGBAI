"use client";

import { Modal, ModalHeader } from "./modal";

export function GrowthModal({ onClose }: { onClose: () => void }) {
  return <Modal onClose={onClose} label="成长月报">
    <ModalHeader kicker="成长月报 · GROWTH REVIEW" onClose={onClose} />
    <p className="py-8 font-serif text-ink-mute">暂无成长报告。积累真实记录后再生成月报。</p>
  </Modal>;
}
