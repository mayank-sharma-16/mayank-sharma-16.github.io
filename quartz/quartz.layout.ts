import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [
    () => ({
      render: () => `<span class="header-text">Monthly Unique Visitors: 12.66k</span>`
    })
  ],
  afterBody: [],
  footer: Component.Footer({
    links: {
      "Write a Note to Mank": "https://forms.gle/Sqf9tc9CoHCufKJNA",
      "Facebook": "https://www.facebook.com/profile.php?id=61594404141618",
      "Instagram": "https://www.instagram.com/mank.notes/",
      "Quora": "https://www.quora.com/profile/Mayank-Sharma-7963",
      "Threads": "https://www.threads.com/@mank.notes",
      "Reddit": "https://www.reddit.com/user/manknotes/",
      "Tumblr": "https://www.tumblr.com/manknotes",
      "BlueSky": "https://bsky.app/profile/manknotes.bsky.social",
      "Mastodon": "https://mastodon.social/@manknotes",
      "Substack": "https://substack.com/@manknotes",
      "Medium": "https://medium.com/@manknotes",
      "Letterboxd": "https://letterboxd.com/manknotes/"
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
