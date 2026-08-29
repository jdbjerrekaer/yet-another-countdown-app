import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CountdownCard } from '../CountdownCard';
import { CountdownEvent } from '@/types/countdown';
import styles from './styles.module.scss';

interface SortableCountdownCardProps {
  event: CountdownEvent;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => Promise<boolean> | void;
  isReordering: boolean;
  isDragDisabled?: boolean;
  isNative?: boolean;
  isMobile?: boolean;
  isDeleting?: boolean;
  isRestoring?: boolean;
}

export function SortableCountdownCard({
  event,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  isReordering,
  isDragDisabled = false,
  isNative = false,
  isMobile = false,
  isDeleting = false,
  isRestoring = false,
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

  const initialTransformRef = useRef<{ x: number; y: number } | null>(null);
  
  if (isDragging && transform && initialTransformRef.current === null) {
    initialTransformRef.current = { x: transform.x, y: transform.y };
  } else if (!isDragging && initialTransformRef.current !== null) {
    initialTransformRef.current = null;
  }

  const translateOnly = isDragging && initialTransformRef.current
    ? `translate3d(${Math.round(initialTransformRef.current.x)}px, ${Math.round(initialTransformRef.current.y)}px, 0)`
    : transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  const style: React.CSSProperties = {
    transform: translateOnly,
    transition: isDragging 
      ? 'none' 
      : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease-out',
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
    touchAction: isDragging ? 'none' : 'pan-y',
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: isDragging ? 'transform' : 'auto',
    transformOrigin: 'center center',
    opacity: isDragging ? 0 : 1,
  };

  const cardClasses = [
    styles.sortableCard,
    isDragging && styles.isDragging,
    !isNative && isSelected && styles.isSelected,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClasses}
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
        isNative={isNative}
        isDeleting={isDeleting}
        isRestoring={isRestoring}
      />
    </div>
  );
}
