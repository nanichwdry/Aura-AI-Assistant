import React from "react";
import { ToolCard } from "./ToolCard";
import { LucideIcon } from "lucide-react";

interface Tool {
  name: string;
  icon: LucideIcon;
  color: string;
}

interface ToolDockProps {
  tools: Tool[];
  onToolClick: (toolName: string) => void;
  activeToolId?: string | null;
}

const TOOL_GROUPS = {
  Information: ["Weather", "News", "Wikipedia", "Time"],
  Entertainment: ["Music", "Games"],
  Customization: ["Background", "Themes"],
  Development: ["Code Editor", "Code Analyzer"],
  Tools: ["Sketchpad", "Summarizer", "Task Manager", "Notepad", "Translator"],
  Special: ["The Founder", "Aura Memory"]
};

export function ToolDock({ tools, onToolClick, activeToolId }: ToolDockProps) {
  const getToolsByGroup = (groupName: string) => {
    const groupTools = TOOL_GROUPS[groupName as keyof typeof TOOL_GROUPS] || [];
    return tools.filter(t => groupTools.includes(t.name));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-[var(--aura-core)] to-[var(--aura-violet)] rounded-full"></div>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Neural Modules
        </h2>
      </div>

      <div className="space-y-6 custom-scrollbar overflow-y-auto max-h-[calc(100vh-200px)]">
        {Object.keys(TOOL_GROUPS).map((groupName) => {
          const groupTools = getToolsByGroup(groupName);
          if (groupTools.length === 0) return null;

          return (
            <div key={groupName}>
              <h3 className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-soft)" }}>
                {groupName}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {groupTools.map((tool) => (
                  <ToolCard
                    key={tool.name}
                    icon={tool.icon}
                    label={tool.name}
                    active={activeToolId === tool.name}
                    onClick={() => onToolClick(tool.name)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
