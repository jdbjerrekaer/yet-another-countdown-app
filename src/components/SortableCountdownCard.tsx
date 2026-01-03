import { useEffect, useRef, useState } from 'react';
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

  // Store the initial transform when dragging starts to maintain position
  const initialTransformRef = useRef<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    if (isDragging && transform) {
      // Store initial transform when drag starts
      if (initialTransformRef.current === null) {
        initialTransformRef.current = { x: transform.x, y: transform.y };
      }
    } else {
      // Reset when not dragging
      initialTransformRef.current = null;
    }
  }, [isDragging, transform]);

  // Track rotation angle state for smooth animation
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const previousYRef = useRef<number | null>(null);
  const previousXRef = useRef<number | null>(null);
  const targetRotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate dynamic tilt based on both vertical and horizontal movement
  useEffect(() => {
    if (isDragging && transform) {
      const currentY = transform.y;
      const currentX = transform.x;
      const previousY = previousYRef.current;
      const previousX = previousXRef.current;

      if (previousY !== null && previousX !== null) {
        // Calculate deltas (positive Y = moving down, positive X = moving right)
        const deltaY = currentY - previousY;
        const deltaX = currentX - previousX;
        
        // Calculate rotation angle based on movement direction
        // Vertical movement: highly reactive
        // Moving down (positive deltaY) = positive tilt, moving up (negative deltaY) = negative tilt
        const verticalTiltMultiplier = 0.08; // Much more reactive vertical tilt
        const verticalRotationDelta = -deltaY * verticalTiltMultiplier;

        // Horizontal movement: noticeable tilt
        // Moving right (positive deltaX) = positive tilt, moving left (negative deltaX) = negative tilt
        const horizontalTiltMultiplier = 0.05; // Much more noticeable horizontal tilt
        const horizontalRotationDelta = deltaX * horizontalTiltMultiplier;
        
        // Combine both rotation deltas
        const rotationDelta = verticalRotationDelta + horizontalRotationDelta;
        
        // Update target rotation (accumulate changes)
        targetRotationRef.current += rotationDelta;
        
        // Clamp target rotation to reasonable range (-8deg to +8deg) - much larger range for more reactivity
        targetRotationRef.current = Math.max(-8, Math.min(8, targetRotationRef.current));
      } else {
        // Initialize when starting to drag
        targetRotationRef.current = 0;
      }

      previousYRef.current = currentY;
      previousXRef.current = currentX;
    } else {
      // Reset when not dragging
      targetRotationRef.current = 0;
      previousYRef.current = null;
      previousXRef.current = null;
      setRotationAngle(0);
    }
  }, [transform, isDragging]);

  // Smooth interpolation of rotation angle using requestAnimationFrame
  useEffect(() => {
    if (isDragging) {
      const animate = () => {
        setRotationAngle((current) => {
          const target = targetRotationRef.current;
          const diff = target - current;
          
          // Smooth interpolation factor (0.4 = much more responsive)
          const factor = 0.4;
          const newAngle = current + diff * factor;
          
          // Continue animation if change is significant enough
          if (Math.abs(diff) > 0.01) {
            animationFrameRef.current = requestAnimationFrame(animate);
            return newAngle;
          } else {
            // Reached target, but keep checking in case target changes
            animationFrameRef.current = requestAnimationFrame(animate);
            return target;
          }
        });
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      // Clean up animation when not dragging
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isDragging]);

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
