import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CountdownCard } from './CountdownCard';
import { CountdownEvent } from '@/types/countdown';

interface SortableCountdownCardProps {
  event: CountdownEvent;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isReordering: boolean;
  isDragDisabled?: boolean;
}

export function SortableCountdownCard({
  event,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  isReordering,
  isDragDisabled = false,
}: SortableCountdownCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: event.id,
    disabled: isDragDisabled,
  });

  // Build transform string - only use translate to prevent squishing
  // dnd-kit sometimes adds scaleY which distorts the element
  const translateOnly = transform 
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;
  
  // Add tilt and slight scale when dragging for lift effect
  const finalTransform = isDragging 
    ? `${translateOnly || ''} rotate(1.5deg) scale(1.02)`.trim()
    : translateOnly;

  const style: React.CSSProperties = {
    transform: finalTransform,
    // Fluid spring-like transition for smooth movement
    transition: isDragging 
      ? 'box-shadow 0.3s ease-out, transform 0.15s ease-out' 
      : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease-out',
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
    touchAction: 'manipulation',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-countdown-card ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''}`}
      {...attributes}
      {...listeners}
    >
      <CountdownCard
        event={event}
        isSelected={isSelected}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        isReordering={isReordering}
        isDragging={isDragging}
      />
    </div>
  );
}
