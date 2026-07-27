#!/bin/sh
set -eu

model="${WHISPER_MODEL:-large-v3-turbo}"
model_dir="${ZENBUKKO_WHISPER_MODEL_DIR:-/data/models/whisper}"
case "$model" in
  tiny) sha1=bd577a113a864445d4c299885e0cb97d4ba92b5f ;; tiny.en) sha1=c78c86eb1a8faa21b369bcd33207cc90d64ae9df ;;
  base) sha1=465707469ff3a37a2b9b8d8f89f2f99de7299dac ;; base.en) sha1=137c40403d78fd54d454da0f9bd998f78703390c ;;
  small) sha1=55356645c2b361a969dfd0ef2c5a50d530afd8d5 ;; small.en) sha1=db8a495a91d927739e50b3fc1cc4c6b8f6c2d022 ;;
  small.en-tdrz) sha1=b6c6e7e89af1a35c08e6de56b66ca6a02a2fdfa1 ;; medium) sha1=fd9727b6e1217c2f614f9b698455c4ffd82463b4 ;;
  medium.en) sha1=8c30f0e44ce9560643ebd10bbe50cd20eafd3723 ;; large-v1) sha1=b1caaf735c4cc1429223d5a74f0f4d0b9b59a299 ;;
  large-v2) sha1=0f4c8e34f21cf1a914c59d8b3ce882345ad349d6 ;; large-v2-q5_0) sha1=00e39f2196344e901b3a2bd5814807a769bd1630 ;;
  large-v3) sha1=ad82bf6a9043ceed055076d0fd39f5f186ff8062 ;; large-v3-q5_0) sha1=e6e2ed78495d403bef4b7cff42ef4aaadcfea8de ;;
  large-v3-turbo) sha1=4af2b29d7ec73d781377bfd1758ca957a807e941 ;; large-v3-turbo-q5_0) sha1=e050f7970618a659205450ad97eb95a18d69c9ee ;;
  *) echo "No upstream checksum is recorded for Whisper model '$model'. Use a supported verified model." >&2; exit 1 ;;
esac

mkdir -p "$model_dir"
target="$model_dir/ggml-$model.bin"
verify() { [ -s "$1" ] && printf '%s  %s\n' "$sha1" "$1" | sha1sum -c - >/dev/null 2>&1; }
if verify "$target"; then
  echo "Verified Whisper model: $target"
  exit 0
fi

temporary=$(mktemp "$model_dir/.ggml-$model.bin.part.XXXXXX")
trap 'rm -f "$temporary"' EXIT HUP INT TERM
echo "Downloading verified Whisper model: $model"
curl --fail --location --retry 3 --retry-delay 2 --output "$temporary" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$model.bin"
if ! verify "$temporary"; then
  echo "Downloaded Whisper model failed upstream SHA-1 verification." >&2
  exit 1
fi
mv -f "$temporary" "$target"
trap - EXIT HUP INT TERM
echo "Installed Whisper model: $target"
