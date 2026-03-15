import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import type { Package } from "@/types/packageTypes";

// Draggable row wrapper component
export function DraggableRow({
  row,
  children,
}: {
  row: { original: Package };
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.original._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-0 hover:bg-muted/50 data-[state=selected]:bg-muted"
    >
      <td className="py-4 text-right">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}
