# Dnd-kit

<!-- toc -->

- [Dnd-kit](#dnd-kit)
  - [Quick Guide: Drag and Drop in React with `dnd-kit` (TypeScript Edition)](#quick-guide-drag-and-drop-in-react-with-dnd-kit-typescript-edition)
    - [1. Installation](#1-installation)
    - [2. Basic Concepts](#2-basic-concepts)
    - [3. Simple Drag and Drop Example (Non-Sortable)](#3-simple-drag-and-drop-example-non-sortable)
    - [4. Sortable List Example](#4-sortable-list-example)
    - [5. Dragging Between Multiple Containers](#5-dragging-between-multiple-containers)
    - [7. Further Exploration](#7-further-exploration)
  - [**Example**: English Sentence Reorder Game with dnd](#example-english-sentence-reorder-game-with-dnd)

<!-- tocstop -->

## Quick Guide: Drag and Drop in React with `dnd-kit` (TypeScript Edition)

`dnd-kit` is a modern, lightweight, and highly customizable drag and drop toolkit for React. It prioritizes performance, accessibility, and extensibility, making it an excellent choice for a wide range of drag-and-drop functionalities.

### 1\. Installation

First, you need to install `dnd-kit`. Open your terminal in your React project directory and run:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
# OR
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- `@dnd-kit/core`: The core library providing fundamental drag and drop primitives.
- `@dnd-kit/sortable`: Utilities for easily creating sortable lists.
- `@dnd-kit/utilities`: General-purpose utilities.

### 2\. Basic Concepts

`dnd-kit` revolves around a few key components and hooks:

- **`<DndContext>`**: The main provider component that wraps your drag-and-drop enabled areas. It manages the state and provides necessary context for drag operations.
- **`useDraggable`**: A hook used to make an element draggable. It provides properties like `attributes`, `listeners`, and `setNodeRef` to connect to your DOM element.
- **`useDroppable`**: A hook used to make an element a drop target. It provides `setNodeRef` to connect to your DOM element and `isOver` to check if a draggable item is currently over it.
- **`onDragStart`**, **`onDragOver`**, **`onDragEnd`**: Event handlers within `<DndContext>` to respond to the different stages of a drag operation. These handlers receive an `event` object of type `DragStartEvent`, `DragOverEvent`, or `DragEndEvent` respectively, which contain information about the active (dragged) and over (dropped on) elements.

---

### 3\. Simple Drag and Drop Example (Non-Sortable)

Let's create a basic example where you can drag a box and drop it into a designated area.

```tsx
import React, { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  UniqueIdentifier, // Import UniqueIdentifier for IDs
} from "@dnd-kit/core";

// Define the props for our Draggable component
interface DraggableProps {
  id: UniqueIdentifier; // IDs in dnd-kit should be UniqueIdentifier
  children: React.ReactNode;
}

// Draggable Component
function Draggable({ children, id }: DraggableProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  });
  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        cursor: "grab",
        padding: "10px",
        backgroundColor: "#007bff",
        color: "white",
        borderRadius: "5px",
        border: "none",
        touchAction: "none", // Important for touch devices
      }
    : {
        cursor: "grab",
        padding: "10px",
        backgroundColor: "#007bff",
        color: "white",
        borderRadius: "5px",
        border: "none",
        touchAction: "none",
      };

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </button>
  );
}

// Define the props for our Droppable component
interface DroppableProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
}

// Droppable Component
function Droppable({ children, id }: DroppableProps): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });
  const style: React.CSSProperties = {
    backgroundColor: isOver ? "lightblue" : "#f0f0f0",
    padding: "20px",
    border: "2px dashed gray",
    minHeight: "100px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "20px",
    borderRadius: "8px",
    textAlign: "center",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}

// App Component
function App(): JSX.Element {
  const [parent, setParent] = useState<UniqueIdentifier | null>(null); // To track where the draggable item is dropped

  const handleDragEnd = (event: DragEndEvent): void => {
    const { over } = event;
    if (over) {
      setParent(over.id);
    } else {
      setParent(null); // If dropped outside any droppable area
    }
  };

  const draggableMarkup: JSX.Element = (
    <Draggable id="draggable-item">Drag me!</Draggable>
  );

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        style={{
          display: "flex",
          gap: "20px",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px",
        }}
      >
        <h2>Simple Drag and Drop Example</h2>
        {!parent ? draggableMarkup : null} {/* Only show draggable if not in droppable */}
        <Droppable id="droppable-area">
          {parent === "droppable-area" ? draggableMarkup : "Drop here"}
        </Droppable>
        <p>Current Item Location: {parent || "Initial Position"}</p>
      </div>
    </DndContext>
  );
}

export default App;
```

**Explanation:**

- **`DraggableProps` and `DroppableProps` interfaces**: We define explicit types for the props of our reusable components, ensuring type safety. Notice the use of `UniqueIdentifier` for `id`, which is `dnd-kit`'s recommended type for element IDs.
- **`handleDragEnd`**: The `event` parameter is explicitly typed as `DragEndEvent` from `@dnd-kit/core`. This gives you strong typing for `event.active` and `event.over` properties.
- **`parent` state**: Typed as `UniqueIdentifier | null` to correctly reflect its possible values.

---

### 4\. Sortable List Example

For sortable lists, `dnd-kit` provides specific hooks and utilities in `@dnd-kit/sortable`.

```tsx
import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  UniqueIdentifier,
  PointerSensor,
  useSensor,
  useSensors, // For using multiple sensors
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove, // Utility to reorder arrays
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define the props for our SortableItem component
interface SortableItemProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
}

// SortableItem Component
function SortableItem({ id, children }: SortableItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px",
    margin: "5px 0",
    border: "1px solid #ddd",
    backgroundColor: "white",
    cursor: "grab",
    borderRadius: "4px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
      <span style={{ fontSize: "0.8em", color: "#888" }}> (drag handle)</span>
    </div>
  );
}

// SortableList Component
function SortableList(): JSX.Element {
  const [items, setItems] = useState<string[]>([
    "Item 1",
    "Item 2",
    "Item 3",
    "Item 4",
    "Item 5",
  ]);

  // We are using the PointerSensor to enable drag on touch and mouse.
  // This is a good default for general drag-and-drop.
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      // Check if over exists before accessing its id
      setItems((prevItems: string[]) => {
        const oldIndex: number = prevItems.indexOf(active.id as string); // active.id is UniqueIdentifier, cast to string
        const newIndex: number = prevItems.indexOf(over!.id as string); // over.id is UniqueIdentifier, cast to string and assert it exists
        return arrayMove(prevItems, oldIndex, newIndex); // arrayMove is a utility from @dnd-kit/sortable
      });
    }
  };

  return (
    <DndContext
      sensors={sensors} // Pass the configured sensors
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items} // `items` array must contain the `id` of each sortable item
        strategy={verticalListSortingStrategy}
      >
        <div
          style={{
            width: "350px",
            border: "1px solid #ddd",
            padding: "10px",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3>Sortable List Example</h3>
          {items.map((item: string) => (
            <SortableItem key={item} id={item}>
              {item}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SortableList;
```

**Explanation:**

- **`SortableItemProps`**: Again, type-safe props for the sortable item.
- **`useSensor(PointerSensor)`**: We explicitly define and use `PointerSensor`. This sensor handles both mouse and touch input, making your drag-and-drop accessible on various devices. `useSensors` allows you to combine multiple sensors if needed.
- **`handleDragEnd`**:
  - The `event` is typed as `DragEndEvent`.
  - We add a null check for `over?.id` as `over` can be `null` if an item is dropped outside any droppable area.
  - `active.id as string` and `over!.id as string`: `dnd-kit`'s IDs are `UniqueIdentifier`. In this example, our `items` array contains strings, so we cast the `UniqueIdentifier` to `string` for array operations. The `!` (non-null assertion) on `over!.id` is safe because we already checked `over?.id`.
  - **`arrayMove`**: This is a powerful utility from `@dnd-kit/sortable` that simplifies reordering arrays based on old and new indices.

---

### 5\. Dragging Between Multiple Containers

This is a common and slightly more complex use case. We'll enable dragging items from one list to another.

```tsx
import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  UniqueIdentifier,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Reusing SortableItem component from above
interface SortableItemProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // New: check if item is being dragged
  } = useSortable({ id: id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px",
    margin: "5px 0",
    border: "1px solid #ddd",
    backgroundColor: isDragging ? "#e0f7fa" : "white", // Highlight when dragging
    color: isDragging ? "#007bff" : "black",
    cursor: "grab",
    borderRadius: "4px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    opacity: isDragging ? 0.5 : 1, // Make original item slightly transparent when dragging
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// DroppableContainer component
interface DroppableContainerProps {
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  children: React.ReactNode;
  title: string;
}

function DroppableContainer({
  id,
  items,
  children,
  title,
}: DroppableContainerProps): JSX.Element {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  const style: React.CSSProperties = {
    width: "300px",
    minHeight: "200px",
    border: "2px solid #ccc",
    borderRadius: "8px",
    padding: "15px",
    backgroundColor: "#f5f5f5",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  };

  return (
    <SortableContext
      id={id}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <div ref={setNodeRef} style={style}>
        <h4>{title}</h4>
        {children}
      </div>
    </SortableContext>
  );
}

// MultiContainerApp Component
function MultiContainerApp(): JSX.Element {
  const [containers, setContainers] = useState<{
    [key: string]: UniqueIdentifier[];
  }>({
    container1: ["Task A", "Task B", "Task C"],
    container2: ["Task X", "Task Y"],
    container3: [],
  });
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const findContainer = (id: UniqueIdentifier): string | undefined => {
    if (id in containers) {
      return id as string;
    }
    return Object.keys(containers).find((key: string) =>
      containers[key].includes(id)
    );
  };

  const handleDragStart = (event: any): void => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (!over) return; // If dropped outside any container

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      // Same container sorting
      const oldIndex = containers[activeContainer].indexOf(active.id);
      const newIndex = containers[overContainer].indexOf(over.id);
      setContainers((prev) => ({
        ...prev,
        [activeContainer]: arrayMove(prev[activeContainer], oldIndex, newIndex),
      }));
    } else {
      // Moving between containers
      const activeIndex = containers[activeContainer].indexOf(active.id);
      const newIndex = containers[overContainer].indexOf(over.id);

      setContainers((prev) => {
        const newContainers = { ...prev };
        const [movedItem] = newContainers[activeContainer].splice(
          activeIndex,
          1
        );
        newContainers[overContainer].splice(newIndex, 0, movedItem);
        return newContainers;
      });
    }
    setActiveId(null);
  };

  const getActiveItem = (): JSX.Element | null => {
    if (!activeId) return null;
    const containerId = findContainer(activeId);
    if (!containerId) return null;
    return <SortableItem id={activeId}>{activeId}</SortableItem>;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: "flex",
          gap: "30px",
          padding: "20px",
          justifyContent: "center",
        }}
      >
        {Object.keys(containers).map((containerId: string) => (
          <DroppableContainer
            key={containerId}
            id={containerId}
            items={containers[containerId]}
            title={`Container ${containerId.replace("container", "")}`}
          >
            {containers[containerId].map((item: UniqueIdentifier) => (
              <SortableItem key={item} id={item}>
                {item}
              </SortableItem>
            ))}
          </DroppableContainer>
        ))}
      </div>
      {/* DragOverlay to show a copy of the dragged item during the drag operation */}
      <DragOverlay>{getActiveItem()}</DragOverlay>
    </DndContext>
  );
}

export default MultiContainerApp;
```

**Explanation:**

- **`isDragging` in `SortableItem`**: We use the `isDragging` property from `useSortable` to visually differentiate the item being dragged (e.g., lower opacity, different background).
- **`DroppableContainer`**: This component now acts as both a `Droppable` target (via `useDroppable`) and a `SortableContext` provider, allowing items within it to be sorted, and items from other containers to be dropped into it.
- **`containers` state**: This state now holds an object where keys are container IDs and values are arrays of item IDs. This structure helps manage items across multiple lists.
- **`findContainer`**: A helper function to determine which container an item (or container itself) belongs to.
- **`handleDragStart`**: We use this to set `activeId` when a drag begins. This is essential for the `DragOverlay`.
- **`handleDragEnd` logic**:
  - It checks if the `activeContainer` and `overContainer` are the same.
  - If they are, it performs a simple `arrayMove` within that container (like the previous sortable example).
  - If they are different, it performs a more complex operation: it removes the item from its original container's array (`splice`) and inserts it into the new container's array (`splice` again).
- **`DragOverlay`**: This is a critical component for seamless multi-container drag-and-drop. When you drag an item, `DragOverlay` creates a clone of the `active` item that floats above the content. The original item remains in place (and can be made semi-transparent with `opacity: 0.5` on `isDragging`) until `onDragEnd` reorders the actual data. This provides a much smoother user experience, preventing flickering or awkward jumps.
  - `getActiveItem()`: A helper to render the item that should appear in the `DragOverlay`.

---

### 7\. Further Exploration

- **Sensors**: Dive deeper into different `sensors` (`PointerSensor`, `KeyboardSensor`, `MouseSensor`, `TouchSensor`, `Activator`). They control how drag operations are initiated and are crucial for specific interaction patterns.
- **Collision Detection**: Experiment with various `collisionDetection` algorithms (`closestCorners`, `closestCenter`, `rectIntersection`, and creating custom ones) to define how droppable areas are determined.
- **Modifiers**: Use `modifiers` (functions that modify the `transform` of the dragged item) to restrict movement (e.g., `restrictToVerticalAxis`, `restrictToWindowEdges`, `restrictToFirstScrollableAncestor`).
- **Custom Drag Handles**: Instead of making the entire item draggable, you can specify a smaller area or element within your draggable component as the drag handle.
- **Context API for Global State**: For more complex applications, consider using React's Context API or a state management library to manage the state of your draggable/droppable items, rather than passing props down through many levels.
- **Conditional Dragging/Dropping**: Learn how to enable or disable dragging/dropping based on certain conditions.

---

## **Example**: English Sentence Reorder Game with dnd

```tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  UniqueIdentifier,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  Active,
  Over,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define the structure for a sentence object
interface Sentence {
  id: UniqueIdentifier;
  text: string;
  correctWords: string[];
}

// Define the structure for a word item with a unique ID
interface WordItem {
  id: UniqueIdentifier; // Unique ID for each instance of a word card
  text: string; // The actual word text
}

// Props for Draggable Word Card
interface WordCardProps {
  id: UniqueIdentifier;
  word: string;
}

// Draggable Word Card Component
const WordCard: React.FC<WordCardProps> = ({ id, word }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id }); // Use useSortable for draggable items that can also be sorted

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "12px 18px",
    margin: "6px",
    borderRadius: "8px",
    backgroundColor: isDragging ? "#e0f7fa" : "#ffffff",
    color: isDragging ? "#007bff" : "#333333",
    border: "1px solid #e2e8f0",
    boxShadow: isDragging
      ? "0 4px 10px rgba(0,0,0,0.1)"
      : "0 2px 5px rgba(0,0,0,0.05)",
    cursor: "grab",
    fontSize: "1.1rem",
    fontWeight: "500",
    display: "inline-block", // For inline display in source box
    touchAction: "none", // Essential for preventing default browser touch actions
    zIndex: isDragging ? 10 : 1, // Ensure dragged item is on top
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {word}
    </div>
  );
};

// Props for the Target Box (Droppable Area)
interface TargetBoxProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
  droppedWordsIds: UniqueIdentifier[]; // Array of unique IDs of words in the target box
}

// Target Box Component
const TargetBox: React.FC<TargetBoxProps> = ({
  id,
  children,
  droppedWordsIds,
}) => {
  const { setNodeRef } = useSortable({ id }); // Make the target box sortable itself to allow drops

  const style: React.CSSProperties = {
    minHeight: "150px",
    border: "2px dashed #93c5fd", // blue-300
    borderRadius: "12px",
    padding: "15px",
    backgroundColor: "#eff6ff", // blue-50
    display: "flex",
    flexWrap: "wrap",
    alignContent: "flex-start",
    gap: "8px",
    transition: "background-color 0.2s ease-in-out",
  };

  return (
    <SortableContext
      items={droppedWordsIds}
      strategy={verticalListSortingStrategy}
    >
      <div ref={setNodeRef} style={style}>
        {children}
      </div>
    </SortableContext>
  );
};

// Common words for generating random extra words
const commonWords: string[] = [
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "should",
  "can",
  "could",
  "may",
  "might",
  "must",
  "for",
  "and",
  "nor",
  "but",
  "or",
  "yet",
  "so",
  "in",
  "on",
  "at",
  "by",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "s",
  "t",
  "can",
  "will",
  "just",
  "don",
  "should",
  "now",
  "this",
  "that",
  "these",
  "those",
  "he",
  "she",
  "it",
  "we",
  "they",
  "you",
  "i",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "this",
  "that",
  "these",
  "those",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "say",
  "says",
  "said",
  "go",
  "goes",
  "went",
  "gone",
  "get",
  "gets",
  "got",
  "gotten",
  "make",
  "makes",
  "made",
  "know",
  "knows",
  "knew",
  "known",
  "think",
  "thinks",
  "thought",
  "take",
  "takes",
  "took",
  "taken",
  "see",
  "sees",
  "saw",
  "seen",
  "come",
  "comes",
  "came",
  "coming",
  "want",
  "wants",
  "wanted",
  "use",
  "uses",
  "used",
  "find",
  "finds",
  "found",
  "give",
  "gives",
  "gave",
  "given",
  "tell",
  "tells",
  "told",
  "work",
  "works",
  "worked",
  "call",
  "calls",
  "called",
  "try",
  "tries",
  "tried",
  "ask",
  "asks",
  "asked",
  "need",
  "needs",
  "needed",
  "feel",
  "feels",
  "felt",
  "become",
  "becomes",
  "became",
  "leave",
  "leaves",
  "left",
  "put",
  "puts",
  "put",
  "mean",
  "means",
  "meant",
  "keep",
  "keeps",
  "kept",
  "let",
  "lets",
  "let",
  "begin",
  "begins",
  "began",
  "begun",
  "seem",
  "seems",
  "seemed",
  "help",
  "helps",
  "helped",
  "talk",
  "talks",
  "talked",
  "turn",
  "turns",
  "turned",
  "start",
  "starts",
  "started",
  "show",
  "shows",
  "showed",
  "shown",
  "hear",
  "hears",
  "heard",
  "play",
  "plays",
  "played",
  "run",
  "runs",
  "ran",
  "run",
];

// Main App Component
const App: React.FC = () => {
  // Define the sentences for the game
  const sentences: Sentence[] = useMemo(
    () => [
      {
        id: "sent-1",
        text: "The quick brown fox jumps over the lazy dog.",
        correctWords: [
          "The",
          "quick",
          "brown",
          "fox",
          "jumps",
          "over",
          "the",
          "lazy",
          "dog",
          ".",
        ],
      },
      {
        id: "sent-2",
        text: "Learning React with dnd-kit is fun.",
        correctWords: [
          "Learning",
          "React",
          "with",
          "dnd-kit",
          "is",
          "fun",
          ".",
        ],
      },
      {
        id: "sent-3",
        text: "Practice makes perfect in language learning.",
        correctWords: [
          "Practice",
          "makes",
          "perfect",
          "in",
          "language",
          "learning",
          ".",
        ],
      },
    ],
    []
  );

  // State to manage the current sentence index
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  // State for words available to drag from the source box (now WordItem[])
  const [availableWords, setAvailableWords] = useState<WordItem[]>([]);
  // State for words dropped into the target box (now WordItem[])
  const [droppedWords, setDroppedWords] = useState<WordItem[]>([]);
  // State for displaying feedback messages
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  // State to hold the ID of the currently active (dragged) item for DragOverlay
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Configure Dnd-kit sensors (for mouse and touch interactions)
  const sensors = useSensors(useSensor(PointerSensor));

  // Get the current sentence based on the index
  const currentSentence: Sentence = sentences[currentSentenceIndex];

  // Helper function to generate words for the current sentence
  // This includes correct words and some extra random words, all shuffled.
  const generateWordsForSentence = useCallback(
    (sentence: Sentence): WordItem[] => {
      // Split by space but keep spaces to re-join later, then filter out empty strings
      const words = sentence.text
        .split(/(\s+)/)
        .filter((w) => w.trim().length > 0);
      // Re-split including punctuation as separate "words" for better sorting experience
      const finalWords = words
        .flatMap((word) => word.split(/([.,!?;:"])/))
        .filter((w) => w.trim().length > 0);

      const numExtraWords = 3; // Number of extra random words to add
      const currentSentenceWordsLower = finalWords.map((w) => w.toLowerCase());
      const extraWords: string[] = [];

      // Add random words that are not already in the sentence
      while (extraWords.length < numExtraWords) {
        const randomIndex = Math.floor(Math.random() * commonWords.length);
        const randomWord = commonWords[randomIndex];
        if (!currentSentenceWordsLower.includes(randomWord.toLowerCase())) {
          extraWords.push(randomWord);
        }
      }

      const combinedWordsText = [...finalWords, ...extraWords];
      // Create WordItem objects with unique IDs for each word instance
      const combinedWordItems: WordItem[] = combinedWordsText.map(
        (wordText) => ({
          id: crypto.randomUUID(), // Assign a unique ID to each word instance
          text: wordText,
        })
      );

      // Shuffle the combined array of WordItem objects
      for (let i = combinedWordItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinedWordItems[i], combinedWordItems[j]] = [
          combinedWordItems[j],
          combinedWordItems[i],
        ];
      }
      return combinedWordItems;
    },
    []
  );

  // Effect to initialize words when the component mounts or sentence changes
  useEffect(() => {
    resetGameForSentence();
  }, [currentSentenceIndex, sentences, generateWordsForSentence]); // Depend on sentence changes and generator

  // Function to reset the game state for the current sentence
  const resetGameForSentence = useCallback(() => {
    const words = generateWordsForSentence(currentSentence);
    setAvailableWords(words);
    setDroppedWords([]);
    setFeedbackMessage("");
  }, [currentSentence, generateWordsForSentence]);

  // Function to play the audio of the current sentence
  const playSentenceAudio = useCallback(() => {
    if (currentSentence && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentSentence.text);
      utterance.lang = "en-US"; // Set language for better pronunciation
      window.speechSynthesis.speak(utterance);
      setFeedbackMessage("Playing audio...");
      utterance.onend = () => setFeedbackMessage("");
      utterance.onerror = () => setFeedbackMessage("Audio playback failed.");
    } else {
      setFeedbackMessage("Text-to-speech not supported in this browser.");
    }
  }, [currentSentence]);

  // Handle the end of a drag operation
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset activeId for DragOverlay
      setActiveId(null);

      if (!over) {
        return; // Dropped outside any droppable area
      }

      const activeItem: WordItem | undefined =
        availableWords.find((item) => item.id === active.id) ||
        droppedWords.find((item) => item.id === active.id);

      if (!activeItem) return; // Should not happen if item was dragged

      const overIsTargetBox: boolean = over.id === "target-box";
      const overItemIndexInDropped: number = droppedWords.findIndex(
        (item) => item.id === over.id
      );

      // Scenario 1: Dragging from available words to target box (or onto a word within target box)
      if (
        availableWords.some((item) => item.id === active.id) &&
        (overIsTargetBox || overItemIndexInDropped !== -1)
      ) {
        setAvailableWords((prev) =>
          prev.filter((item) => item.id !== active.id)
        ); // Remove from available
        setDroppedWords((prev) => {
          const newDroppedWords = [...prev];
          if (overItemIndexInDropped !== -1) {
            // Insert at specific position if over another word
            newDroppedWords.splice(overItemIndexInDropped, 0, activeItem);
          } else {
            // Add to the end of the target box if over the target box itself
            newDroppedWords.push(activeItem);
          }
          return newDroppedWords;
        });
      }
      // Scenario 2: Reordering within the target box
      else if (
        droppedWords.some((item) => item.id === active.id) &&
        overItemIndexInDropped !== -1 &&
        active.id !== over.id
      ) {
        const oldIndex = droppedWords.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = overItemIndexInDropped;
        setDroppedWords((prev) => arrayMove(prev, oldIndex, newIndex));
      }
      // Scenario 3: Dragging a word from target box back to available words (or outside)
      // For this guide, we won't allow dragging words out of the target box back to source.
      // The user can re-shuffle if they make a mistake.
    },
    [availableWords, droppedWords]
  );

  // Handle the start of a drag operation for DragOverlay
  const handleDragStart = useCallback((event: { active: Active }) => {
    setActiveId(event.active.id);
  }, []);

  // Find the word object for DragOverlay
  const getActiveWord = useCallback((): JSX.Element | null => {
    if (!activeId) return null;

    // Find the active word item from either availableWords or droppedWords
    const activeWordItem =
      availableWords.find((item) => item.id === activeId) ||
      droppedWords.find((item) => item.id === activeId);

    if (activeWordItem) {
      return <WordCard id={activeWordItem.id} word={activeWordItem.text} />;
    }
    return null;
  }, [activeId, availableWords, droppedWords]);

  // Check the user's answer
  const checkAnswer = useCallback(() => {
    // Normalize words for comparison (remove punctuation, lower case, filter empty strings)
    const normalize = (word: string): string =>
      word.replace(/[.,!?;:"]+/g, "").toLowerCase();

    // Map dropped WordItem objects back to their text for comparison
    const userAnswerText: string[] = droppedWords.map((item) => item.text);

    const userAnswerNormalized: string[] = userAnswerText.map(normalize);
    const correctAnswerNormalized: string[] =
      currentSentence.correctWords.map(normalize);

    // Filter out empty strings that might result from normalization of punctuation
    const filteredUserAnswer = userAnswerNormalized.filter((w) => w.length > 0);
    const filteredCorrectAnswer = correctAnswerNormalized.filter(
      (w) => w.length > 0
    );

    // Simple check: compare the joined strings
    const isCorrect =
      filteredUserAnswer.join(" ") === filteredCorrectAnswer.join(" ");

    if (isCorrect) {
      setFeedbackMessage("🎉 Correct! Well done!");
      setTimeout(() => {
        const nextIndex = currentSentenceIndex + 1;
        if (nextIndex < sentences.length) {
          setCurrentSentenceIndex(nextIndex);
        } else {
          setFeedbackMessage(
            "🥳 Congratulations! You completed all sentences!"
          );
          setCurrentSentenceIndex(0); // Loop back to the first sentence
        }
      }, 1500); // Wait a bit before moving to the next sentence
    } else {
      setFeedbackMessage("❌ Try again. The order is not quite right.");
      // Shuffle available words again and clear dropped words
      setTimeout(() => {
        resetGameForSentence();
      }, 1500);
    }
  }, [
    droppedWords,
    currentSentence,
    currentSentenceIndex,
    sentences.length,
    resetGameForSentence,
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners} // Use closestCorners for more precise dropping
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-inter">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Sentence Scramble Challenge
          </h1>

          <div className="mb-8 p-4 bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-between shadow-sm">
            <p className="text-lg text-blue-800 font-medium">
              Current Sentence:{" "}
              <span className="italic">"{currentSentence.text}"</span>
            </p>
            <button
              onClick={playSentenceAudio}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105"
            >
              🔊 Play Audio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Source Box */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Available Words (Drag these)
              </h3>
              <div className="flex flex-wrap items-center justify-center min-h-[120px]">
                {availableWords.length === 0 && droppedWords.length > 0 && (
                  <p className="text-gray-500 italic">
                    No more words here. Move them all!
                  </p>
                )}
                {availableWords.map((item: WordItem) => (
                  <WordCard key={item.id} id={item.id} word={item.text} />
                ))}
              </div>
            </div>

            {/* Target Box */}
            <div className="bg-white p-5 rounded-lg border border-indigo-200 shadow-md">
              <h3 className="text-xl font-semibold text-indigo-700 mb-4">
                Your Sentence (Drop here)
              </h3>
              <TargetBox
                id="target-box"
                droppedWordsIds={droppedWords.map((item) => item.id)}
              >
                {droppedWords.length === 0 ? (
                  <p className="text-gray-400 text-center w-full">
                    Drag words here to build the sentence...
                  </p>
                ) : (
                  droppedWords.map((item: WordItem) => (
                    <WordCard key={item.id} id={item.id} word={item.text} />
                  ))
                )}
              </TargetBox>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={checkAnswer}
              disabled={droppedWords.length === 0} // Disable if no words are dropped
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
            {feedbackMessage && (
              <p
                className={`text-center text-lg font-semibold mt-4 ${
                  feedbackMessage.includes("Correct")
                    ? "text-green-700"
                    : "text-red-600"
                }`}
              >
                {feedbackMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DragOverlay renders the dragged item on top of everything */}
      <DragOverlay>{activeId ? getActiveWord() : null}</DragOverlay>
    </DndContext>
  );
};

export default App;
```
