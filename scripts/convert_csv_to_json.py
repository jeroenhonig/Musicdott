#!/usr/bin/env python3
"""
Musicdott 1.0 CSV to Musicdott 2.0 JSON Converter
Converts POS_Songs.csv and POS_Notatie.csv to the JSON format expected by Musicdott 2.0
Enhanced with comprehensive Groovescribe normalization
"""

import csv
import json
import argparse
import os
import sys
import re
from typing import Dict, List, Any


def normalize_groovescribe(input_str: str) -> str:
    """
    Normalizes all Groovescribe variants to a consistent iframe embed.
    Handles: iframe HTML, full URLs, and bare querystrings.
    """
    if not input_str or input_str.strip().lower() == 'nan':
        return ""
    
    s = str(input_str).strip()
    PREFER_HOST = "https://teacher.musicdott.com/groovescribe/GrooveEmbed.html"
    
    # Case 1: Already an iframe - extract src and normalize
    if s.startswith('<iframe'):
        src_match = re.search(r'src=["\']([^"\']+)["\']', s, re.IGNORECASE)
        if src_match:
            src_url = src_match.group(1)
            # Extract query parameters
            if '?' in src_url:
                query = src_url.split('?', 1)[1]
            elif 'TimeSig=' in src_url:
                query = 'TimeSig=' + src_url.split('TimeSig=', 1)[1]
            else:
                query = ""
            
            if query:
                return f'<iframe width="100%" height="240" src="{PREFER_HOST}?{query}" frameborder="0"></iframe>'
    
    # Case 2: Full URL (teacher.musicdott.com or mikeslessons.com)
    elif s.startswith('http'):
        if '?' in s:
            query = s.split('?', 1)[1]
        elif 'TimeSig=' in s:
            query = 'TimeSig=' + s.split('TimeSig=', 1)[1]
        else:
            query = ""
        
        if query:
            return f'<iframe width="100%" height="240" src="{PREFER_HOST}?{query}" frameborder="0"></iframe>'
    
    # Case 3: Bare query (?TimeSig=... or TimeSig=...)
    elif s.startswith('?TimeSig=') or s.startswith('TimeSig='):
        query = s[1:] if s.startswith('?') else s
        return f'<iframe width="100%" height="240" src="{PREFER_HOST}?{query}" frameborder="0"></iframe>'
    
    # Return as-is if not recognizable Groovescribe content
    return s


def youtube_url_to_iframe(url: str) -> str:
    """Convert YouTube URL to iframe embed HTML"""
    if not url or not isinstance(url, str) or url.strip().lower() == 'nan':
        return ""
    
    s = str(url).strip()
    
    # Handle different YouTube URL formats
    youtube_patterns = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:m\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)'
    ]
    
    for pattern in youtube_patterns:
        match = re.search(pattern, s)
        if match:
            video_id = match.group(1)
            return f'<iframe width="560" height="315" src="https://www.youtube.com/embed/{video_id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
    
    return s


def safe_get(row: Dict, key: str, default: str = "") -> str:
    """Safely get value from CSV row with fallback"""
    value = row.get(key, default)
    if value is None or str(value).strip().lower() == 'nan':
        return default
    return str(value).strip()


def convert_songs_csv_to_json(csv_file: str) -> List[Dict[str, Any]]:
    """Convert POS_Songs.csv to Musicdott 2.0 songs JSON format"""
    songs = []
    
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        csv_data = None
        
        for encoding in encodings:
            try:
                with open(csv_file, 'r', encoding=encoding, newline='') as file:
                    csv_data = file.read()
                    print(f"Successfully read {csv_file} with {encoding} encoding")
                    break
            except UnicodeDecodeError:
                continue
        
        if csv_data is None:
            raise Exception(f"Could not read {csv_file} with any supported encoding")
        
        # Parse CSV with high field size limit
        csv.field_size_limit(1000000)  # 1MB field limit
        
        from io import StringIO
        reader = csv.DictReader(StringIO(csv_data))
        
        for row_num, row in enumerate(reader, 1):
            try:
                # Extract basic info
                title = safe_get(row, 'soTitel') or safe_get(row, 'titel') or f"Song #{row_num}"
                artist = safe_get(row, 'soArtiest') or safe_get(row, 'artiest') or "Unknown Artist"
                
                # Build description from genre, BPM, length
                desc_parts = []
                genre = safe_get(row, 'soGenre') or safe_get(row, 'genre')
                bpm = safe_get(row, 'soBPM') or safe_get(row, 'bpm')
                length = safe_get(row, 'soLengte') or safe_get(row, 'lengte')
                
                if genre and genre != "0":
                    desc_parts.append(f"Genre: {genre}")
                if bpm and bpm != "0":
                    desc_parts.append(f"BPM: {bpm}")
                if length and length != "0":
                    desc_parts.append(f"Lengte: {length}")
                
                description = " | ".join(desc_parts) if desc_parts else ""
                
                # Build content from various sources
                content_parts = []
                
                # YouTube (convert to iframe)
                youtube = safe_get(row, 'soYouTube') or safe_get(row, 'youtube')
                if youtube:
                    iframe = youtube_url_to_iframe(youtube)
                    if iframe:
                        content_parts.append(iframe)
                
                # Spotify, Apple Music, Lyrics (keep as URLs)
                spotify = safe_get(row, 'soSpotify') or safe_get(row, 'spotify')
                if spotify:
                    content_parts.append(f"Spotify: {spotify}")
                
                apple = safe_get(row, 'soAppleMusic') or safe_get(row, 'apple_music')
                if apple:
                    content_parts.append(f"Apple Music: {apple}")
                
                lyrics = safe_get(row, 'soLyrics') or safe_get(row, 'lyrics')
                if lyrics:
                    content_parts.append(f"Lyrics: {lyrics}")
                
                # Groovescribe notations (enhanced normalization)
                for i in range(1, 4):  # soNotatie01, soNotatie02, soNotatie03
                    notation = safe_get(row, f'soNotatie0{i}') or safe_get(row, f'notatie0{i}')
                    if notation:
                        normalized_groove = normalize_groovescribe(notation)
                        if normalized_groove:
                            content_parts.append(normalized_groove)
                            
                            # Add corresponding remarks
                            remarks = safe_get(row, f'soOpmerkingen0{i}') or safe_get(row, f'opmerkingen0{i}')
                            if remarks:
                                content_parts.append(f"Note: {remarks}")
                
                # Create song object
                song = {
                    "title": title,
                    "artist": artist,
                    "instrument": "drums",
                    "level": "all",
                    "description": description,
                    "content": "\n\n".join(content_parts)
                }
                
                songs.append(song)
                
            except Exception as e:
                print(f"Warning: Error processing song row {row_num}: {e}")
                continue
                
    except Exception as e:
        print(f"Error reading songs CSV: {e}")
        
    return songs


def convert_notatie_csv_to_json(csv_file: str) -> List[Dict[str, Any]]:
    """Convert POS_Notatie.csv to Musicdott 2.0 lessons JSON format"""
    lessons = []
    
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        csv_data = None
        
        for encoding in encodings:
            try:
                with open(csv_file, 'r', encoding=encoding, newline='') as file:
                    csv_data = file.read()
                    print(f"Successfully read {csv_file} with {encoding} encoding")
                    break
            except UnicodeDecodeError:
                continue
        
        if csv_data is None:
            raise Exception(f"Could not read {csv_file} with any supported encoding")
        
        # Parse CSV with high field size limit
        csv.field_size_limit(1000000)  # 1MB field limit
        
        from io import StringIO
        reader = csv.DictReader(StringIO(csv_data))
        
        for row_num, row in enumerate(reader, 1):
            try:
                # Build title from category, chapter, sequence
                category = safe_get(row, 'noCategorie') or safe_get(row, 'categorie')
                chapter = safe_get(row, 'noHoofdstuk') or safe_get(row, 'hoofdstuk')
                sequence = safe_get(row, 'noVolgnummer') or safe_get(row, 'volgnummer')
                
                if category and chapter and sequence:
                    title = f"{category} – {chapter} – #{sequence}"
                elif category and sequence:
                    title = f"{category} – #{sequence}"
                else:
                    title = f"Pattern #{row_num}"
                
                # Description from remarks
                description = safe_get(row, 'noOpmerkingen') or safe_get(row, 'opmerkingen')
                
                # Build content from notation and sources
                content_parts = []
                
                # Main notation (enhanced normalization)
                notation = safe_get(row, 'noNotatie') or safe_get(row, 'notatie')
                if notation:
                    normalized_groove = normalize_groovescribe(notation)
                    if normalized_groove:
                        content_parts.append(normalized_groove)
                
                # Video sources
                video = safe_get(row, 'noVideo') or safe_get(row, 'video')
                if video:
                    iframe = youtube_url_to_iframe(video)
                    if iframe:
                        content_parts.append(f"Video: {iframe}")
                
                # Other sources
                musescore = safe_get(row, 'noMusescore') or safe_get(row, 'musescore')
                if musescore:
                    content_parts.append(f"MuseScore: {musescore}")
                
                musicxml = safe_get(row, 'musicxml')
                if musicxml:
                    content_parts.append(f"MusicXML: {musicxml}")
                
                pdf_lesson = safe_get(row, 'noPDFlesson') or safe_get(row, 'pdf_lesson')
                if pdf_lesson:
                    content_parts.append(f"PDF: {pdf_lesson}")
                
                mp3 = safe_get(row, 'noMP3') or safe_get(row, 'mp3')
                if mp3:
                    content_parts.append(f"MP3: {mp3}")
                
                # Create lesson object
                lesson = {
                    "title": title,
                    "description": description,
                    "contentType": "notation",
                    "instrument": "drums",
                    "level": "all",
                    "content": "\n\n".join(content_parts)
                }
                
                lessons.append(lesson)
                
            except Exception as e:
                print(f"Warning: Error processing notation row {row_num}: {e}")
                continue
                
    except Exception as e:
        print(f"Error reading notation CSV: {e}")
        
    return lessons


def convert_students_csv_to_json(csv_file: str) -> tuple[list, list]:
    """Convert Musicdott_fullexport_students.csv to students + schedule JSON"""
    students = []
    schedule = []
    
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        csv_data = None
        
        for encoding in encodings:
            try:
                with open(csv_file, 'r', encoding=encoding, newline='') as file:
                    csv_data = file.read()
                    print(f"Successfully read {csv_file} with {encoding} encoding")
                    break
            except UnicodeDecodeError:
                continue
        
        if csv_data is None:
            raise Exception(f"Could not read {csv_file} with any supported encoding")
        
        # Parse CSV with high field size limit
        csv.field_size_limit(1000000)  # 1MB field limit
        
        from io import StringIO
        reader = csv.DictReader(StringIO(csv_data))
        
        # Day name mappings
        day_mapping = {
            'ma': 'MO', 'maandag': 'MO', 'monday': 'MO',
            'di': 'TU', 'dinsdag': 'TU', 'tuesday': 'TU', 
            'wo': 'WE', 'woensdag': 'WE', 'wednesday': 'WE',
            'do': 'TH', 'donderdag': 'TH', 'thursday': 'TH',
            'vr': 'FR', 'vrijdag': 'FR', 'friday': 'FR',
            'za': 'SA', 'zaterdag': 'SA', 'saturday': 'SA',
            'zo': 'SU', 'zondag': 'SU', 'sunday': 'SU'
        }
        
        for row_num, row in enumerate(reader, 1):
            try:
                # Extract student info
                student_id = safe_get(row, 'stid') or str(row_num)
                first_name = safe_get(row, 'stVoornaam')
                last_name = safe_get(row, 'stNaam')
                email = safe_get(row, 'stEmail')
                phone = safe_get(row, 'stTelefoonmobiel') or safe_get(row, 'stTelefoonvast')
                city = safe_get(row, 'stWoonplaats')
                notes = safe_get(row, 'stOpmerkingen')
                
                # Create student object
                student = {
                    "id": student_id,
                    "firstName": first_name,
                    "lastName": last_name, 
                    "fullName": f"{first_name} {last_name}".strip(),
                    "email": email if email and email != "nan" else None,
                    "phone": phone if phone and phone != "nan" else None,
                    "city": city if city and city != "nan" else None,
                    "notes": notes if notes and notes != "nan" else None,
                    "instrument": "drums"
                }
                students.append(student)
                
                # Process lesson schedule (up to 2 lessons per student)
                for i in [1, 2]:
                    day_key = f'stLesdag{i}'
                    time_key = f'stLestijd{i}'
                    duration_key = f'stLesduur{i}'
                    
                    day_raw = safe_get(row, day_key)
                    time_raw = safe_get(row, time_key)
                    duration_raw = safe_get(row, duration_key)
                    
                    if not day_raw or not time_raw or day_raw == "nan" or time_raw == "nan":
                        continue
                    
                    # Parse day
                    day_code = day_mapping.get(day_raw.lower().strip())
                    if not day_code:
                        continue
                    
                    # Parse time (15:30 or 15.30)
                    time_clean = time_raw.replace('.', ':')
                    if ':' not in time_clean or len(time_clean.split(':')) != 2:
                        continue
                    
                    try:
                        hours, minutes = time_clean.split(':')
                        hours = int(hours)
                        minutes = int(minutes)
                        start_time = f"{hours:02d}:{minutes:02d}"
                    except:
                        continue
                    
                    # Parse duration (default 30 minutes)
                    try:
                        duration_min = int(duration_raw) if duration_raw and duration_raw != "nan" else 30
                    except:
                        duration_min = 30
                    
                    # Calculate next occurrence for iCal DTSTART
                    from datetime import datetime, timedelta
                    today = datetime.now()
                    days_ahead = ['MO','TU','WE','TH','FR','SA','SU'].index(day_code)
                    days_ahead = (days_ahead - today.weekday()) % 7
                    if days_ahead == 0:  # Today
                        days_ahead = 7  # Next week
                    next_occurrence = today + timedelta(days=days_ahead)
                    dtstart = f"{next_occurrence.strftime('%Y%m%d')}T{start_time.replace(':', '')}00"
                    
                    # Create schedule entry
                    schedule_entry = {
                        "studentId": student_id,
                        "studentName": student["fullName"],
                        "email": email,
                        "dayOfWeek": day_code,
                        "startTime": start_time,
                        "durationMin": duration_min,
                        "timezone": "Europe/Amsterdam",
                        "frequency": "WEEKLY",
                        "ical": {
                            "DTSTART": dtstart,
                            "TZID": "Europe/Amsterdam",
                            "RRULE": f"FREQ=WEEKLY;BYDAY={day_code};BYHOUR={hours};BYMINUTE={minutes};BYSECOND=0"
                        },
                        "notes": notes if notes and notes != "nan" else None
                    }
                    schedule.append(schedule_entry)
                    
            except Exception as e:
                print(f"Warning: Error processing student row {row_num}: {e}")
                continue
                
    except Exception as e:
        print(f"Error reading students CSV: {e}")
        
    return students, schedule


def main():
    parser = argparse.ArgumentParser(description='Convert Musicdott 1.0 CSV to 2.0 JSON')
    parser.add_argument('--songs', help='Path to POS_Songs.csv file')
    parser.add_argument('--notatie', help='Path to POS_Notatie.csv file')
    parser.add_argument('--students', help='Path to Musicdott_fullexport_students.csv file')
    parser.add_argument('--outdir', default='export', help='Output directory for JSON files')
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    os.makedirs(args.outdir, exist_ok=True)
    
    # Convert songs if provided
    if args.songs and os.path.exists(args.songs):
        print(f"Converting songs from {args.songs}...")
        songs = convert_songs_csv_to_json(args.songs)
        
        output_file = os.path.join(args.outdir, 'musicdott2_songs.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(songs, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Converted {len(songs)} songs to {output_file}")
    
    # Convert notation if provided  
    if args.notatie and os.path.exists(args.notatie):
        print(f"Converting lessons from {args.notatie}...")
        lessons = convert_notatie_csv_to_json(args.notatie)
        
        output_file = os.path.join(args.outdir, 'musicdott2_lessons.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lessons, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Converted {len(lessons)} lessons to {output_file}")
    
    # Convert students if provided
    if args.students and os.path.exists(args.students):
        print(f"Converting students and schedule from {args.students}...")
        students, schedule = convert_students_csv_to_json(args.students)
        
        # Save students JSON
        students_file = os.path.join(args.outdir, 'musicdott2_students.json')
        with open(students_file, 'w', encoding='utf-8') as f:
            json.dump(students, f, ensure_ascii=False, indent=2)
        
        # Save schedule JSON
        schedule_file = os.path.join(args.outdir, 'musicdott2_schedule.json')
        with open(schedule_file, 'w', encoding='utf-8') as f:
            json.dump(schedule, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Converted {len(students)} students to {students_file}")
        print(f"✅ Converted {len(schedule)} schedule entries to {schedule_file}")
    
    if not args.songs and not args.notatie and not args.students:
        print("Please provide --songs, --notatie, and/or --students CSV files to convert")
        sys.exit(1)
    
    print("🎉 Complete MusicDott 1.0 to 2.0 conversion finished!")
    print("   📋 Students: musicdott2_students.json")
    print("   📅 Schedule: musicdott2_schedule.json") 
    print("   🎵 Songs: musicdott2_songs.json")
    print("   📚 Lessons: musicdott2_lessons.json")


if __name__ == "__main__":
    main()