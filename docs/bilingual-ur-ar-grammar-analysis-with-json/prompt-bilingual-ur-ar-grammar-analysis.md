# Comprehensive Project Prompt: Urdu Grammar TypeScript Service Layer

## Project Overview

Create a complete, type-safe TypeScript service layer for accessing and analyzing 20 comprehensive Urdu grammar topics with full English-Arabic bilingual support. The project involves digitizing grammar content from an open-source Urdu textbook and providing programmatic access through a robust API.

## Data Structure Understanding

### Key Terminology

- **Topic**: A single grammar lesson (e.g., 4.7 = Chapter 4, Topic 7)
- **Chapter**: A collection of related topics (e.g., Chapter 8 has topics 8.6, 8.7, 8.8, 8.9)
- **Topic ID Format**: `${chapter_number}.${topic_number}` (e.g., "3.7", "8.9")

### Data Organization

- **20 Topics** across **6 Chapters** (Chapters 3-8)
- Total data size: ~804KB of structured JSON
- Each topic is a separate JSON file following the format: `urdu_*_ch${chapter}-${topic}.json`

### Chapter Coverage

1. **Chapter 3**: 2 topics (Adjectives, Questions)
2. **Chapter 4**: 3 topics (Postpositions, Cases, Constructions)
3. **Chapter 5**: 3 topics (Subjects, Needs, Possession)
4. **Chapter 6**: 4 topics ✅ COMPLETE (Verbs, Imperatives, Objects, Obligations)
5. **Chapter 7**: 4 topics ✅ COMPLETE (Tense, Habitual, Progressive, Future)
6. **Chapter 8**: 4 topics ✅ COMPLETE (Perfective, کر Construction, Conjunct Verbs, Subjunctive)

## Type System Requirements

### Base Type Generation

- Use **quicktype.io** to generate comprehensive base types from actual JSON data
- Main interface: `GrammarTopic` (represents a single grammar topic)
- The base types file (`quick-type_io.ts`) should be ~63KB with complete coverage

### Core Type Structures

```typescript
// Main topic interface
export interface GrammarTopic {
  location_meta: LocationMeta;
  instructor_summary: CriticalRule; // {english, arabic}
  core_concepts: CoreConcept[];
  activities?: Activity[];
  vocabulary_bank?: VocabularyBank;
  linguistic_notes?: LinguisticNotes;
  pedagogical_notes: PedagogicalNotes;
  additional_resources: AdditionalResources;
  arabic_linguistic_comparison?: ArabicLinguisticComparison;
  common_mistakes?: CommonMistakes;
  // ... many more optional fields
}

// Bilingual text (English + Arabic only)
export interface CriticalRule {
  english: string;
  arabic: string;
}

// Trilingual text (can include Urdu)
export interface Title {
  urdu: string;
  english?: string;
  arabic?: string;
  transliteration?: string;
  // ... additional optional fields
}

// Flexible example structure
export interface PoliteRequest {
  urdu: string;
  transliteration?: string;
  english: string;
  arabic?: string;
  note?: string;
  breakdown?: any;
  // ... many more optional fields
}
```

### Service Layer Types

```typescript
// Topic identification
export type TopicId = `${number}.${number}`;

// Collection management
export interface TopicCollection {
  total_topics: number;
  total_size_kb: number;
  topics_by_id: Map<string, UrduGrammarChapter>;
  chapters_with_topics: number[];
  coverage_summary: Record<string, {
    topics_count: number;
    topics: string[];
  }>;
}

// Search results
export interface SearchResult {
  topic: UrduGrammarChapter;
  relevance_score: number;
  matching_concepts: any[];
  matching_examples: any[];
}

// Error handling
export class TopicNotFoundError extends Error
export class InvalidTopicDataError extends Error

// Query types
export interface TopicQuery {
  chapter_number?: number;
  topic_number?: number;
  search_term?: string;
  grammar_feature?: string;
}
```

## Service Layer Architecture

### 1. UrduGrammarTopicService (Core Loading)

```typescript
class UrduGrammarTopicService {
  // Load single topic
  async loadTopic(chapterNumber: number, topicNumber: number): Promise<UrduGrammarChapter>

  // Load all topics
  async loadAllTopics(): Promise<TopicCollection>

  // Load topics from specific chapter
  async loadTopicsByChapter(chapterNumber: number): Promise<UrduGrammarChapter[]>

  // Cache management
  clearCache(): void

  // Private validation
  private validateTopic(topic: any, topicId: TopicId): void
}
```

**Features:**

- In-memory caching with Map
- Automatic validation of topic structure
- Type-safe loading with proper error handling
- Default data path: `/mnt/user-data/outputs`

### 2. UrduGrammarSearchService (Search & Query)

```typescript
class UrduGrammarSearchService {
  // Full-text search across all topics
  async search(query: string, language: Language): Promise<SearchResult[]>

  // Find topics by grammar feature
  async findByGrammarFeature(feature: GrammarFeature): Promise<UrduGrammarChapter[]>

  // Pattern matching in Urdu text
  async findExamplesByPattern(pattern: RegExp): Promise<Array<{
    topic: UrduGrammarChapter;
    concept: any;
    example: any;
  }>>
}
```

**Search Capabilities:**

- Multilingual search (English/Arabic/Urdu)
- Relevance scoring
- Grammar feature filtering (18 features: case, agreement, aspect, tense, etc.)
- Regex pattern matching for Urdu text

### 3. UrduGrammarAnalysisService (Data Extraction)

```typescript
class UrduGrammarAnalysisService {
  // Extract all vocabulary
  async extractVocabulary(): Promise<Map<string, any[]>>

  // Extract verb conjugation paradigms
  async extractVerbParadigms(): Promise<Array<{
    topic: UrduGrammarChapter;
    verb: string;
    paradigm: any;
  }>>

  // Extract common mistakes
  async extractCommonMistakes(): Promise<Array<{
    topic: UrduGrammarChapter;
    mistakes: any[];
  }>>

  // Generate statistics
  async getStatistics(): Promise<Statistics>

  // Extract Arabic-Urdu comparisons
  async compareArabicUrduFeatures(): Promise<Array<{
    topic: UrduGrammarChapter;
    comparison: any;
  }>>
}
```

**Analysis Features:**

- Vocabulary extraction with category grouping
- Verb paradigm collection
- Common mistakes compilation
- Comprehensive statistics
- Linguistic comparison extraction

### 4. UrduGrammarExportService (Data Export)

```typescript
class UrduGrammarExportService {
  // Export topic as formatted text
  async exportTopicAsText(
    chapterNumber: number,
    topicNumber: number,
    language: Language
  ): Promise<string>

  // Export all topics as JSON
  async exportAllAsJSON(): Promise<string>

  // Export vocabulary as CSV
  async exportVocabularyAsCSV(): Promise<string>
}
```

**Export Formats:**

- Markdown-formatted text
- JSON array of all topics
- CSV with columns: TopicID, Chapter, Topic, Category, Urdu, English, Arabic, Note

## Critical Type Safety Considerations

### Helper Functions Required

```typescript
// Safe access to CriticalRule (no 'urdu' property, only english/arabic)
function getCriticalRuleText(
  rule: CriticalRule | undefined,
  language: Language
): string

// Safe access to Title (can be string or object with optional properties)
function getTitleText(
  title: Title | string | undefined,
  language: Language
): string
```

### Type Safety Issues to Address

1. **CriticalRule Indexing**: Cannot index with `Language` type because it doesn't have `urdu` property

   ```typescript
   // ERROR: Property 'urdu' does not exist on type 'CriticalRule'
   chapter.instructor_summary[language]

   // FIX: Use helper function
   getCriticalRuleText(chapter.instructor_summary, language)
   ```

2. **Optional Properties**: Title.english can be undefined

   ```typescript
   // ERROR: Type 'string | undefined' not assignable to 'string'
   chapter.location_meta.title.english

   // FIX: Use helper with fallback
   getTitleText(chapter.location_meta.title, "english")
   ```

3. **Flexible Properties**: Some CoreConcept properties not in base type

   ```typescript
   // ERROR: Property 'conjugation' does not exist on type 'CoreConcept'
   concept.conjugation

   // FIX: Use type assertion
   const conceptAny = concept as any;
   if (conceptAny.conjugation) { /* ... */ }
   ```

4. **Array Type Checking**: vocabulary_bank values might not be arrays

   ```typescript
   // POTENTIAL ERROR: Not all values are arrays
   for (const items of Object.values(topic.vocabulary_bank)) {
     totalVocabulary += items.length;
   }

   // FIX: Add array check
   if (Array.isArray(items)) {
     totalVocabulary += items.length;
   }
   ```

## Backwards Compatibility Strategy

All old "chapter" terminology should be aliased to new "topic" terminology:

```typescript
// Types
export type ChapterId = TopicId;
export type ChapterQuery = TopicQuery;
export type ChapterCollection = TopicCollection;
export const ChapterNotFoundError = TopicNotFoundError;

// Service methods (deprecated)
class UrduGrammarTopicService {
  /** @deprecated Use loadTopic instead */
  async loadChapter(chapterNumber, topicNumber) {
    return this.loadTopic(chapterNumber, topicNumber);
  }

  /** @deprecated Use loadAllTopics instead */
  async loadAllChapters() { /* ... */ }
}

// Convenience functions (deprecated)
/** @deprecated Use loadTopic instead */
export async function loadChapter(...) { return loadTopic(...); }

/** @deprecated Use searchTopics instead */
export async function searchChapters(...) { return searchTopics(...); }
```

## Convenience Functions API

```typescript
// Modern API (preferred)
export async function loadTopic(chapterNumber, topicNumber, dataPath?)
export async function loadAllTopics(dataPath?)
export async function searchTopics(query, language, dataPath?)
export async function loadTopicsByChapter(chapterNumber, dataPath?)

// Factory function
export function createUrduGrammarServices(dataPath?) {
  return {
    service: UrduGrammarTopicService,
    search: UrduGrammarSearchService,
    analysis: UrduGrammarAnalysisService,
    export: UrduGrammarExportService
  }
}
```

## Data Path Configuration

```typescript
const DEFAULT_DATA_PATH = "/mnt/user-data/outputs";

const TOPIC_FILENAMES: Record<TopicId, string> = {
  "3.7": "urdu_degrees_of_adjectives_ch3-7.json",
  "3.8": "urdu_wh_questions_ch3-8.json",
  "4.6": "urdu_postpositions_ch4-6.json",
  // ... 17 more files
  "8.9": "urdu_subjunctive_ch8-9.json"
};
```

## Example Usage Patterns

### Basic Loading

```typescript
// Load single topic
const topic = await loadTopic(8, 6); // Perfective Aspect
console.log(topic.location_meta.title.english);

// Load all topics
const collection = await loadAllTopics();
console.log(`Total: ${collection.total_topics} topics`);

// Load topics from one chapter
const chapter8Topics = await loadTopicsByChapter(8);
// Returns: [8.6, 8.7, 8.8, 8.9]
```

### Searching

```typescript
// Full-text search
const results = await searchTopics('ergative', 'english');

// Grammar feature search
const { search } = createUrduGrammarServices();
const aspectTopics = await search.findByGrammarFeature('aspect');

// Pattern matching
const neExamples = await search.findExamplesByPattern(/نے/);
```

### Analysis

```typescript
const { analysis } = createUrduGrammarServices();

// Get vocabulary
const vocabulary = await analysis.extractVocabulary();

// Get verb paradigms
const paradigms = await analysis.extractVerbParadigms();

// Get statistics
const stats = await analysis.getStatistics();
console.log(`Topics: ${stats.total_topics}`);
console.log(`Concepts: ${stats.total_concepts}`);
console.log(`Examples: ${stats.total_examples}`);
```

### Export

```typescript
const { export: exportService } = createUrduGrammarServices();

// Export as text
const text = await exportService.exportTopicAsText(8, 6, 'english');

// Export as JSON
const json = await exportService.exportAllAsJSON();

// Export vocabulary as CSV
const csv = await exportService.exportVocabularyAsCSV();
```

## File Structure

```
/mnt/user-data/outputs/
├── quick-type_io.ts              (63KB) - Generated base types
├── urdu-grammar-types.ts         (4.8KB) - Service layer extensions
├── urdu-grammar-service.ts       (22KB) - Main service implementation
├── urdu-grammar-examples.ts      (15KB) - Usage examples (12 examples)
├── README-UPDATED.md             - Documentation
└── [20 JSON files]               - Grammar topic data (~804KB total)
    ├── urdu_degrees_of_adjectives_ch3-7.json
    ├── urdu_wh_questions_ch3-8.json
    ├── ...
    └── urdu_subjunctive_ch8-9.json
```

## Grammar Features Covered

1. **Case System**: Nominative, Oblique, Ergative (Split ergativity - typologically significant)
2. **Agreement**: Subject-verb, adjective-noun
3. **Verb System**: Complete tense-aspect-mood system
   - Tenses: Past, Present, Future
   - Aspects: Habitual, Progressive, Perfective
   - Moods: Imperative, Subjunctive
4. **Ergativity**: Split ergative system with نے marker (perfective transitive)
5. **Conjunct Verbs**: Productive compound verb formation (30-40% of vocabulary)
6. **کر Construction**: Conjunctive participles for sequential actions
7. **Postpositions**: کو، سے، میں، پر and compound forms
8. **Questions**: Wh-question formation
9. **Comparison**: Comparative and superlative degrees
10. **Possession**: Multiple possession strategies

## Arabic Linguistic Comparisons

Each topic includes detailed typological comparisons with Arabic:

- Structural differences (e.g., Urdu's conjunctive participles vs Arabic's finite coordination)
- Functional parallels (e.g., Urdu کرنا/ہونا ≈ Arabic مبني معلوم/مبني للمجهول)
- Productivity contrasts (e.g., Urdu's highly productive conjunct verb system)
- Pedagogical insights for Arabic-speaking learners

## Quality Assurance Requirements

### Type Safety

- ✅ Zero TypeScript errors
- ✅ Proper handling of optional properties
- ✅ Type assertions only where necessary
- ✅ Helper functions for unsafe access patterns

### Robustness

- ✅ Graceful handling of missing data
- ✅ Array type checking before iteration
- ✅ Error handling for file loading
- ✅ Validation of topic structure

### Performance

- ✅ In-memory caching to avoid repeated file reads
- ✅ Lazy loading with cache invalidation support
- ✅ Efficient search with early termination

### Documentation

- ✅ JSDoc comments for all public methods
- ✅ Clear parameter descriptions
- ✅ Usage examples for complex features
- ✅ Deprecation notices for backwards compatibility

## Testing Considerations

### Unit Tests Should Cover

- Loading existing topics
- Error handling for missing topics
- Cache functionality
- Search relevance scoring
- Vocabulary extraction with multiple formats
- Export format correctness

### Integration Tests Should Cover

- Loading all 20 topics successfully
- Search across entire corpus
- Statistics generation
- CSV export format validation

## Use Cases

1. **Language Learning Apps**: Interactive grammar lessons with type-safe data access
2. **Research Tools**: Typological analysis and feature extraction
3. **Educational Platforms**: Searchable grammar reference with exercises
4. **Translation Tools**: Verb conjugation lookup and pattern matching
5. **Data Analysis**: Statistical analysis and cross-linguistic comparisons

## Key Success Metrics

- **Type Coverage**: 100% of JSON structure typed
- **Error Handling**: All error paths covered
- **Documentation**: Every public API documented
- **Examples**: 12+ comprehensive usage examples
- **Backwards Compatibility**: Full support for legacy code
- **Performance**: <100ms to load any topic from cache
- **Correctness**: All 20 topics load without errors

## Common Pitfalls to Avoid

1. **Don't confuse "chapter" with "topic"**: 4.7 is Topic 7 of Chapter 4, not "Chapter 4.7"
2. **Don't assume CriticalRule has 'urdu'**: It only has 'english' and 'arabic'
3. **Don't assume all Title properties exist**: Use fallbacks (title.english || title.urdu || "")
4. **Don't index CriticalRule with Language type**: Use helper functions instead
5. **Don't assume all vocabulary_bank values are arrays**: Check with Array.isArray()
6. **Don't quote string variables in RegExp**: /نے/ not /\"نے\"/
7. **Don't forget to handle both old and new vocabulary_bank structures**: Categories array vs direct properties

## Final Deliverables

1. ✅ `quick-type_io.ts` - Complete generated base types
2. ✅ `urdu-grammar-types.ts` - Service layer type extensions
3. ✅ `urdu-grammar-service.ts` - Full service implementation with all 4 service classes
4. ✅ `urdu-grammar-examples.ts` - 12 comprehensive usage examples
5. ✅ `README-UPDATED.md` - Complete documentation
6. ✅ All TypeScript errors fixed
7. ✅ Backwards compatibility maintained
8. ✅ Proper terminology (topic vs chapter)

---

## Summary

This project creates a production-ready, type-safe TypeScript API for accessing comprehensive Urdu grammar content. The service layer provides four specialized classes (loading, searching, analysis, export) with proper error handling, caching, and multilingual support. The type system is built on quicktype.io-generated base types with service layer extensions, ensuring 100% type safety while maintaining flexibility for the varied JSON structures. All code includes proper backwards compatibility, comprehensive documentation, and real-world usage examples.
