import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
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
    isDragging,
  } = useSortable({ 
    id: event.id,
    disabled: isDragDisabled,
  });

  // Store the initial transform when dragging starts to maintain position
  const initialTransformRef = useRef<{ x: number; y: number } | null>(null);
  
  // Track initial transform for position stability during drag
  if (isDragging && transform && initialTransformRef.current === null) {
    initialTransformRef.current = { x: transform.x, y: transform.y };
  } else if (!isDragging && initialTransformRef.current !== null) {
    initialTransformRef.current = null;
  }

  // Build transform string - only use translate to prevent squishing
  // dnd-kit sometimes adds scaleY which distorts the element
  // When dragging, use the initial transform to maintain exact position
  const translateOnly = isDragging && initialTransformRef.current
    ? `translate3d(${Math.round(initialTransformRef.current.x)}px, ${Math.round(initialTransformRef.current.y)}px, 0)`
    : transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;
  
  // When dragging, keep the translate transform to maintain position
  // but don't add rotation/scale (DragOverlay handles the visual representation)
  // This prevents the card from shifting when drag starts
  const finalTransform = translateOnly;

  const style: React.CSSProperties = {
    transform: finalTransform, // No transform when dragging (DragOverlay handles it)
    // No transitions during drag - rotation is smoothed via requestAnimationFrame
    // Translate stays immediate to prevent jitter, rotation is smoothly interpolated
    transition: isDragging 
      ? 'none' 
      : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease-out',
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    // Hardware acceleration for smooth dragging
    willChange: isDragging ? 'transform' : 'auto',
    // Force GPU acceleration
    transformOrigin: 'center center',
    // Hide the original item while dragging (keep space to avoid layout shift)
    // Use opacity instead of visibility to maintain exact layout position
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-countdown-card ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''}`}
      data-sortable-id={event.id}
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
