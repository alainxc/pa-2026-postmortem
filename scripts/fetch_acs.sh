#!/bin/sh
# Download ACS 2020-2024 5-year table-based summary files (nationwide, one file per table)
# and keep only Pennsylvania county (0500000US42...) and block-group (1500000US42...) rows.
# Source: https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/
set -e
cd "$(dirname "$0")/../data/census"
BASE=https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData
for t in b01003 b19013 b15003 b05002 b03002 b01001; do
  if [ -f "acs5y2024_${t}_pa.dat" ]; then echo "skip $t"; continue; fi
  curl -sS -o "tmp_$t.dat" "$BASE/acsdt5y2024-$t.dat"
  head -1 "tmp_$t.dat" > "acs5y2024_${t}_pa.dat"
  grep -E '^(0500000US42|1500000US42)' "tmp_$t.dat" >> "acs5y2024_${t}_pa.dat"
  rm "tmp_$t.dat"
  echo "ok $t $(wc -l < acs5y2024_${t}_pa.dat) rows"
done
echo done
