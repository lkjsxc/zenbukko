# Chapter Mapping

## Course Order

The downloader fetches the full course chapter list in displayed course order and maps range ordinals to NNN chapter IDs before lesson resolution.

If the NNN API omits explicit `order` fields, the received display order is authoritative. The mapper must not sort those chapters by numeric NNN ID, because that makes `1-5` select unrelated saved folders such as `04`, `07`, `08`, `12`, and `14`.

## Failure Behavior

Mapping failures stop before download work begins so partial chapter selections are not produced.
