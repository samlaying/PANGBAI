"use client";

import type { MessagePart } from "@/business/entities/message-part";

export function GenerativeUIRenderer({
  component,
  props,
}: Extract<MessagePart, { type: "generative_ui" }>) {
  // 基础示例：表格渲染
  if (component === "table" || component === "metric_table") {
    const columns = (props.columns as string[]) || [];
    const rows = (props.rows as (string | number)[][]) || [];

    return (
      <div className="my-3 overflow-x-auto border border-rule bg-paper p-3 text-[13px]">
        <table className="w-full text-left">
          {columns.length > 0 && (
            <thead>
              <tr className="border-b border-rule font-mono text-[11px] text-ink-mute">
                {columns.map((c, i) => (
                  <th key={i} className="pb-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-rule/40 font-serif">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-paper-deep/50">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2 pr-3 text-ink">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="my-2 border border-dashed border-rule p-3 font-mono text-[11px] text-ink-mute">
      [Generative UI Component: {component}]
    </div>
  );
}
