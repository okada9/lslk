# `lslk`

`lslk` (short for _list links_) is a command-line tool for listing links
on web pages.

## Usage

```bash
lslk [options] <urls...>
```

### Options

| Option                 | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `--same-host`          | Only follow links on the same host                       |
| `--child`              | Only follow links whose path is a child of the entry URL |
| `--allow <pattern>`    | Regex pattern for allowed URLs                           |
| `--disallow <pattern>` | Regex pattern for disallowed URLs                        |
| `--delay <seconds>`    | Time to wait between requests (default: `1`)             |
| `--depth <number>`     | Maximum depth of URL search (default: `1`)               |
| `--disable-javascript` | Do not run JavaScript                                    |

## Examples

List URLs of other articles linked from the main page of Wikipedia:

```bash
lslk --same-host 'https://en.wikipedia.org/wiki/Main_Page'
```

List URLs of recent posts on a subreddit:

```bash
lslk --child 'https://www.reddit.com/r/technology/'
```

List URLs of recent social media posts from an account:

```bash
lslk \
   --allow '^https://bsky.app/profile/bsky.app/post/' \
  'https://bsky.app/profile/bsky.app'
```

List URLs of recent news articles published by the BBC:

```bash
lslk \
  --allow '^https://www.bbc.com/news/articles/' \
  'https://www.bbc.com/'
```

List URLs of video clips and shorts of cats on YouTube:

```bash
lslk \
  --allow '^https://www.youtube.com/(watch\?v=|shorts/)' \
  'https://www.youtube.com/results?search_query=cat'
```

List URLs of technology articles from _The Atlantic_ published in 2024:

```bash
lslk \
  --allow '^https://www.theatlantic.com/technology/archive/2024/[0-1][1-9]/' \
  --depth 9 \
  'https://www.theatlantic.com/technology/'
```

## Troubleshooting

### `Navigation timeout of 30000 ms exceeded`

Try disabling JavaScript:

```bash
lslk --disable-javascript <url>
```
