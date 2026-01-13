import { defineConfig } from 'vitepress';

// refer https://vitepress.dev/reference/site-config for details
export default defineConfig({
  lang: 'en-US',
  title: 'AI Articles', // false to hide text and only want logo
  description: 'A comprehensive collection of React, TypeScript, and Next.js guides and tutorials.',
  // logo: "/logo.svg",
  // Outline (table of contents) on the right
// outline: {
//   level: [2, 3], // Show h2 and h3 headings
//   label: 'On this page'
// },

// Edit link
// editLink: {
//   pattern: 'https://github.com/your-username/your-repo/edit/main/docs/:path',
//   text: 'Edit this page on GitHub'
// },

// Last updated timestamp
// lastUpdated: {
//   text: 'Updated at',
//   formatOptions: {
//     dateStyle: 'short',
//     timeStyle: 'short'
//   }
// },

// Document footer (prev/next navigation)
// docFooter: {
//   prev: 'Previous',
//   next: 'Next'
// },

// Return to top
// returnToTopLabel: 'Return to top',

// External link icon
// externalLinkIcon: true,
//   // Appearance toggle (dark/light mode)
//   appearance: true, // Enable dark mode toggle


  themeConfig: {
    // Navigation bar configuration
    nav: [
      { text: 'Home', link: '/' },

      {
        text: 'React & TypeScript',
        items: [
          {
            text: 'State Management',
            items: [
              { text: 'Zustand Guide', link: '/react-ts/state-management/zustand' },
              { text: 'Hookstate Guide', link: '/react-ts/state-management/hookstate' },
            ],
          },
          {
            text: 'React Context',
            items: [
              { text: 'Introduction', link: '/react-ts/react-context/intro' },
              { text: 'Example 1', link: '/react-ts/react-context/ex1' },
              { text: 'Example 2', link: '/react-ts/react-context/ex2' },
              { text: 'Example 3', link: '/react-ts/react-context/ex3' },
            ],
          },
          {
            text: 'TypeScript Mastery',
            items: [
              { text: 'Booklet Guide', link: '/react-ts/master-ts-in-react/booklet-guide' },
              { text: 'Reference Guide', link: '/react-ts/master-ts-in-react/reference-guide' },
            ],
          },
          { text: 'Mastering Hooks', link: '/react-ts/mastering-hooks' },
          { text: 'useReducer with TS', link: '/react-ts/useReducer-ts' },
          { text: 'useMemo & useCallback', link: '/react-ts/useMemo-useCallback' },
          { text: 'JS/TS Collections', link: '/react-ts/js-ts-collections' },
        ],
      },

      {
        text: 'Next.js',
        items: [
          { text: 'Server Actions & SWR', link: '/nextjs/action-swr-example' },
          { text: 'Smart Table Component', link: '/nextjs/smart-table-component' },
          { text: 'Shopping Cart Example', link: '/nextjs/shopping-cart-example' },
          { text: 'Convert to PWA', link: '/nextjs/convert-to-pwa' },
          { text: 'useParams Example', link: '/nextjs/useParams-example' },
        ],
      },

      {
        text: 'More Topics',
        items: [
          { text: 'DnD Kit', link: '/dnd-kit' },
          { text: 'TanStack Query', link: '/tanstack-query-next14-app' },
          {
            text: 'VitePress',
            items: [
              { text: 'Markdown Examples', link: '/vitepress/markdown-examples' },
              { text: 'API Examples', link: '/vitepress/api-examples' },
            ],
          },
        ],
      },
    ],

    // Sidebar configuration - organized by sections
    sidebar: {
      // React & TypeScript sidebar
      '/react-ts/': [
        {
          text: 'React Hooks',
          collapsed: false,
          items: [
            { text: 'Mastering Hooks', link: '/react-ts/mastering-hooks' },
            { text: 'useReducer with TypeScript', link: '/react-ts/useReducer-ts' },
            { text: 'useMemo & useCallback', link: '/react-ts/useMemo-useCallback' },
          ],
        },
        {
          text: 'React Context',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/react-ts/react-context/index' },
            { text: 'Introduction', link: '/react-ts/react-context/intro' },
            { text: 'Example 1: Basic Context', link: '/react-ts/react-context/ex1' },
            { text: 'Example 2: Context with Reducer', link: '/react-ts/react-context/ex2' },
            { text: 'Example 3: Advanced Patterns', link: '/react-ts/react-context/ex3' },
          ],
        },
        {
          text: 'State Management',
          collapsed: false,
          items: [
            { text: 'Zustand Guide', link: '/react-ts/state-management/zustand' },
            { text: 'Hookstate Guide', link: '/react-ts/state-management/hookstate' },
          ],
        },
        {
          text: 'TypeScript Mastery',
          collapsed: false,
          items: [
            { text: 'Booklet Guide', link: '/react-ts/master-ts-in-react/booklet-guide' },
            { text: 'Reference Guide', link: '/react-ts/master-ts-in-react/reference-guide' },
          ],
        },
        {
          text: 'Collections & Utilities',
          collapsed: false,
          items: [
            { text: 'JS/TS Collections', link: '/react-ts/js-ts-collections' },
          ],
        },
      ],

      // Next.js sidebar
      '/nextjs/': [
        {
          text: 'Next.js Examples',
          items: [
            { text: 'Server Actions & SWR', link: '/nextjs/action-swr-example' },
            { text: 'Smart Table Component', link: '/nextjs/smart-table-component' },
            { text: 'Shopping Cart Example', link: '/nextjs/shopping-cart-example' },
            { text: 'useParams Example', link: '/nextjs/useParams-example' },
            { text: 'Convert to PWA', link: '/nextjs/convert-to-pwa' },
          ],
        },
      ],

      // VitePress sidebar
      '/vitepress/': [
        {
          text: 'VitePress Guide',
          items: [
            { text: 'Markdown Examples', link: '/vitepress/markdown-examples' },
            { text: 'API Examples', link: '/vitepress/api-examples' },
          ],
        },
      ],

      // Default sidebar for root and other pages
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/example' },
          ],
        },
        {
          text: 'Popular Topics',
          items: [
            { text: 'DnD Kit Guide', link: '/dnd-kit' },
            { text: 'TanStack Query with Next.js 14', link: '/tanstack-query-next14-app' },
          ],
        },
        {
          text: 'React & TypeScript',
          collapsed: true,
          items: [
            { text: 'Mastering Hooks', link: '/react-ts/mastering-hooks' },
            { text: 'React Context', link: '/react-ts/react-context/intro' },
            { text: 'State Management', link: '/react-ts/state-management/zustand' },
          ],
        },
        {
          text: 'Next.js',
          collapsed: true,
          items: [
            { text: 'Server Actions & SWR', link: '/nextjs/action-swr-example' },
            { text: 'Smart Table Component', link: '/nextjs/smart-table-component' },
          ],
        },
      ],
    },

    // Optional: Add social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],

    // Optional: Add footer
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present AI Articles',
    },

    // search functionality
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search documentation'
              },
              modal: {
                noResultsText: 'No results for',
                resetButtonTitle: 'Clear search',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close'
                }
              }
            }
          }
        }
      }
    },

  },
});
