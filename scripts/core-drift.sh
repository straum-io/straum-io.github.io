#!/usr/bin/env bash
# One open Issue labelled core-drift names the reference sources that differ
# on straum main from the pin; it closes once none does (ECO-D-28 A). The
# pin and the source list live in contracts.mjs. A failed check leaves the
# Issue as it is and fails the run, so a network error closes nothing.
set -euo pipefail

report="$(node scripts/contracts.mjs --ahead)"
printf '%s\n' "$report"

changed="$(printf '%s\n' "$report" | sed -n 's/^::warning title=straum main is ahead of the pin:://p')"
if [ -z "$changed" ] && ! grep -q 'unchanged on straum main' <<<"$report"; then
	echo 'core-drift: contracts.mjs --ahead did not complete' >&2
	exit 1
fi

gh label create core-drift --force --description 'straum main differs from the pinned sources' >/dev/null
open="$(gh issue list --label core-drift --state open --json number --jq '.[0].number // empty')"

if [ -z "$changed" ]; then
	if [ -n "$open" ]; then
		gh issue close "$open" --comment 'The reference sources on straum main match the pin.'
	fi
	exit 0
fi

body="$(printf 'Reference sources that differ on straum `main`:\n\n%s\n\nThe pin moves only in a site PR (ECO-D-14 A): see "Reference pages and the pin" in the README.\n' "$(printf '%s\n' "$changed" | sed 's/^/- /')")"
if [ -n "$open" ]; then
	gh issue edit "$open" --body "$body"
else
	gh issue create --title 'straum main is ahead of the pin' --label core-drift --body "$body"
fi
