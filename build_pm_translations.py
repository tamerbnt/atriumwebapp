#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generates comprehensive, authentic, high-quality translations for all 631 pm_ keys
in English, French, and Arabic, eliminating untranslated French strings in English & Arabic.
"""

import json
import re

with open('pm_keys_dump.json', 'r', encoding='utf-8') as f:
    pm_data = json.load(f)

print(f"Loaded {len(pm_data)} pm_ keys.")
