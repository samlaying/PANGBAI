"use client";

import { PanelBody, PanelHeader } from "./side-panel";

export function MeetingPanel() {
  return <>
    <PanelHeader kicker="会议 · MEETING"><h2 className="font-serif text-[28px] font-black">会议</h2></PanelHeader>
    <PanelBody><p className="font-serif text-ink-mute">暂无会议记录。会议数据接入后会显示在这里。</p></PanelBody>
  </>;
}
