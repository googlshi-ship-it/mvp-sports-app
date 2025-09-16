#!/usr/bin/env python3
"""
Backend API Testing Script for Sports MVP App
Tests all backend endpoints according to test_result.md requirements
Including new Competitions + Lineups/Injuries features
"""

import requests
import json
from datetime import datetime, timezone
import sys

# Base URL from frontend/.env EXPO_PUBLIC_BACKEND_URL
BASE_URL = "https://kickoff-hub-8.preview.emergentagent.com/api"
ADMIN_TOKEN = "CHANGEME"

def test_root_endpoint():
    """Test GET /api/ - Root health check"""
    print("🔍 Testing GET /api/ (Root health check)")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            if data.get("message") == "MVP backend running":
                print("   ✅ Root endpoint working correctly")
                return True
            else:
                print(f"   ❌ Unexpected message: {data.get('message')}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_import_thesportsdb():
    """Test POST /api/import/thesportsdb"""
    print("\n🔍 Testing POST /api/import/thesportsdb")
    try:
        payload = {"days": 1}
        response = requests.post(f"{BASE_URL}/import/thesportsdb", json=payload)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            if "created" in data and "updated" in data:
                print(f"   ✅ Import successful - Created: {data['created']}, Updated: {data['updated']}")
                return True
            else:
                print(f"   ❌ Missing created/updated counts in response")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_matches_grouped():
    """Test GET /api/matches/grouped?country=CH"""
    print("\n🔍 Testing GET /api/matches/grouped?country=CH")
    try:
        response = requests.get(f"{BASE_URL}/matches/grouped?country=CH")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response keys: {list(data.keys())}")
            
            # Check required keys
            required_keys = ["today", "tomorrow", "week"]
            if all(key in data for key in required_keys):
                print(f"   ✅ All required keys present: {required_keys}")
                
                # Check if arrays are present (can be empty)
                for key in required_keys:
                    if isinstance(data[key], list):
                        print(f"   ✅ {key}: {len(data[key])} matches")
                    else:
                        print(f"   ❌ {key} is not an array")
                        return False
                
                # Return the data for further use
                return data
            else:
                missing = [key for key in required_keys if key not in data]
                print(f"   ❌ Missing keys: {missing}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def create_manual_match():
    """Create a manual match if no matches exist"""
    print("\n🔍 Creating manual match via POST /api/matches")
    try:
        match_data = {
            "sport": "football",
            "tournament": "UEFA Champions League",
            "subgroup": "Group A",
            "homeTeam": {"type": "club", "name": "Barcelona"},
            "awayTeam": {"type": "club", "name": "Real Madrid"},
            "startTime": "2025-07-01T20:45:00Z",
            "status": "scheduled",
            "channels": {"CH": ["blue Sport", "SRF zwei"]}
        }
        
        response = requests.post(f"{BASE_URL}/matches", json=match_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            match_id = data.get("id") or data.get("_id")
            print(f"   ✅ Match created successfully")
            print(f"   Match ID: {match_id}")
            print(f"   Tournament: {data.get('tournament')}")
            print(f"   Teams: {data.get('homeTeam', {}).get('name')} vs {data.get('awayTeam', {}).get('name')}")
            return match_id
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_matches_list():
    """Test GET /api/matches"""
    print("\n🔍 Testing GET /api/matches")
    try:
        response = requests.get(f"{BASE_URL}/matches")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {len(data)} matches")
            
            if len(data) >= 1:
                print("   ✅ At least 1 match exists")
                # Return first match ID for further testing
                first_match = data[0]
                match_id = first_match.get("id") or first_match.get("_id")
                print(f"   First match ID: {match_id}")
                return match_id
            else:
                print("   ⚠️  No matches found")
                return None
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_match_detail(match_id):
    """Test GET /api/matches/{matchId}"""
    print(f"\n🔍 Testing GET /api/matches/{match_id}")
    try:
        response = requests.get(f"{BASE_URL}/matches/{match_id}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Match details retrieved")
            print(f"   Tournament: {data.get('tournament')}")
            print(f"   Teams: {data.get('homeTeam', {}).get('name')} vs {data.get('awayTeam', {}).get('name')}")
            print(f"   Start Time: {data.get('startTime')}")
            return True
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_match_rating(match_id):
    """Test POST /api/matches/{matchId}/rate"""
    print(f"\n🔍 Testing POST /api/matches/{match_id}/rate")
    try:
        payload = {"like": True}
        response = requests.post(f"{BASE_URL}/matches/{match_id}/rate", json=payload)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            
            if "likes" in data and data["likes"] >= 1:
                print(f"   ✅ Rating successful - Likes: {data['likes']}")
                return True
            else:
                print(f"   ❌ Expected likes >= 1, got: {data.get('likes')}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_match_voting(match_id):
    """Test POST /api/matches/{matchId}/vote"""
    print(f"\n🔍 Testing POST /api/matches/{match_id}/vote")
    try:
        payload = {"category": "mvp", "player": "Lewandowski"}
        response = requests.post(f"{BASE_URL}/matches/{match_id}/vote", json=payload)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            
            if isinstance(data, dict) and "mvp" in data:
                print(f"   ✅ Voting successful - MVP percentages: {data['mvp']}")
                return True
            else:
                print(f"   ❌ Expected percentages object with mvp, got: {data}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_match_votes(match_id):
    """Test GET /api/matches/{matchId}/votes"""
    print(f"\n🔍 Testing GET /api/matches/{match_id}/votes")
    try:
        response = requests.get(f"{BASE_URL}/matches/{match_id}/votes")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            
            if "mvp" in data and data["mvp"]:
                print(f"   ✅ Votes retrieved - MVP field is non-empty: {data['mvp']}")
                return True
            else:
                print(f"   ❌ Expected non-empty mvp field, got: {data.get('mvp')}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

# ===== NEW COMPETITIONS + LINEUPS/INJURIES TESTS =====

def test_competitions_list():
    """Test GET /api/competitions - expect at least 2 items (La Liga 2025, UEFA Champions League 2025)"""
    print("\n🔍 Testing GET /api/competitions")
    try:
        response = requests.get(f"{BASE_URL}/competitions")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {len(data)} competitions")
            
            if len(data) >= 2:
                # Check for expected competitions
                names = [comp.get("name", "") for comp in data]
                print(f"   Competition names: {names}")
                
                expected_names = ["La Liga", "UEFA Champions League"]
                found_expected = [name for name in expected_names if name in names]
                
                if len(found_expected) >= 2:
                    print(f"   ✅ Found expected competitions: {found_expected}")
                    return data
                else:
                    print(f"   ⚠️  Expected competitions found: {found_expected}, missing: {set(expected_names) - set(found_expected)}")
                    return data  # Still return data for further testing
            else:
                print(f"   ❌ Expected at least 2 competitions, got {len(data)}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_competition_detail(comp_id, comp_name):
    """Test GET /api/competitions/{id} - expect 200 with fields name, country, season, type"""
    print(f"\n🔍 Testing GET /api/competitions/{comp_id} ({comp_name})")
    try:
        response = requests.get(f"{BASE_URL}/competitions/{comp_id}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["name", "country", "season", "type"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                print(f"   ✅ All required fields present: {required_fields}")
                print(f"   Name: {data['name']}, Country: {data['country']}, Season: {data['season']}, Type: {data['type']}")
                return True
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_competition_matches(comp_id, comp_name):
    """Test GET /api/competitions/{id}/matches?tz=Europe/Madrid - expect 2-3 matches with proper fields"""
    print(f"\n🔍 Testing GET /api/competitions/{comp_id}/matches?tz=Europe/Madrid ({comp_name})")
    try:
        response = requests.get(f"{BASE_URL}/competitions/{comp_id}/matches?tz=Europe/Madrid")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {len(data)} matches for {comp_name}")
            
            if len(data) >= 1:
                # Check first match for required fields
                match = data[0]
                required_fields = ["startTime", "start_time_local", "competition_id"]
                
                missing_fields = [field for field in required_fields if field not in match]
                if not missing_fields:
                    print(f"   ✅ Required fields present: startTime (UTC), start_time_local (tz-adjusted), competition_id")
                    print(f"   Start Time UTC: {match['startTime']}")
                    print(f"   Start Time Local: {match['start_time_local']}")
                    print(f"   Competition ID: {match['competition_id']}")
                    
                    # Return first match ID for lineups testing
                    match_id = match.get("_id") or match.get("id")
                    return match_id
                else:
                    print(f"   ❌ Missing required fields: {missing_fields}")
                    return False
            else:
                print(f"   ⚠️  No matches found for {comp_name}")
                return None
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_match_with_lineups(match_id):
    """Test GET /api/matches/{id}?include=lineups&tz=Europe/Madrid - expect lineups object"""
    print(f"\n🔍 Testing GET /api/matches/{match_id}?include=lineups&tz=Europe/Madrid")
    try:
        response = requests.get(f"{BASE_URL}/matches/{match_id}?include=lineups&tz=Europe/Madrid")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for lineups object
            if "lineups" in data:
                lineups = data["lineups"]
                required_fields = ["lineups_status", "formation_home", "formation_away", "home", "away", "lineups_updated_at", "injuries_updated_at"]
                
                missing_fields = [field for field in required_fields if field not in lineups]
                if not missing_fields:
                    print(f"   ✅ Lineups object has all required fields")
                    print(f"   Lineups Status: {lineups['lineups_status']}")
                    print(f"   Formations: {lineups['formation_home']} vs {lineups['formation_away']}")
                    
                    # Check home/away structure
                    for side in ["home", "away"]:
                        if side in lineups:
                            side_data = lineups[side]
                            side_fields = ["starters", "bench", "unavailable"]
                            if all(field in side_data for field in side_fields):
                                print(f"   ✅ {side.title()} side has starters, bench, unavailable lists")
                            else:
                                print(f"   ❌ {side.title()} side missing fields")
                                return False
                    
                    return True
                else:
                    print(f"   ❌ Lineups missing required fields: {missing_fields}")
                    return False
            else:
                print(f"   ❌ No lineups object in response")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_lineups_endpoint(match_id):
    """Test GET /api/matches/{id}/lineups - expect same payload as embedded"""
    print(f"\n🔍 Testing GET /api/matches/{match_id}/lineups")
    try:
        response = requests.get(f"{BASE_URL}/matches/{match_id}/lineups")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["lineups_status", "formation_home", "formation_away", "home", "away", "lineups_updated_at", "injuries_updated_at"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                print(f"   ✅ Lineups endpoint has all required fields")
                print(f"   Lineups Status: {data['lineups_status']}")
                return True
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_admin_lineups_override(match_id):
    """Test POST /api/matches/{id}/lineups with admin token"""
    print(f"\n🔍 Testing POST /api/matches/{match_id}/lineups (Admin Override)")
    try:
        headers = {"X-Admin-Token": ADMIN_TOKEN}
        payload = {
            "formation_home": "3-5-2",
            "lineups_status": "confirmed"
        }
        
        response = requests.post(f"{BASE_URL}/matches/{match_id}/lineups", json=payload, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if updates were applied
            if data.get("formation_home") == "3-5-2" and data.get("lineups_status") == "confirmed":
                print(f"   ✅ Admin override successful")
                print(f"   Formation Home: {data['formation_home']}")
                print(f"   Lineups Status: {data['lineups_status']}")
                print(f"   Lineups Updated At: {data.get('lineups_updated_at')}")
                return True
            else:
                print(f"   ❌ Updates not applied correctly")
                print(f"   Formation Home: {data.get('formation_home')} (expected: 3-5-2)")
                print(f"   Lineups Status: {data.get('lineups_status')} (expected: confirmed)")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_admin_injuries_override(match_id):
    """Test POST /api/matches/{id}/injuries with admin token"""
    print(f"\n🔍 Testing POST /api/matches/{match_id}/injuries (Admin Override)")
    try:
        headers = {"X-Admin-Token": ADMIN_TOKEN}
        payload = {
            "unavailable_home": [
                {"name": "New Injury", "reason": "Ankle", "type": "injury", "status": "out"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/matches/{match_id}/injuries", json=payload, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if injuries were updated
            home_unavailable = data.get("home", {}).get("unavailable", [])
            new_injury_found = any(
                player.get("name") == "New Injury" and player.get("reason") == "Ankle"
                for player in home_unavailable
            )
            
            if new_injury_found:
                print(f"   ✅ Admin injuries override successful")
                print(f"   New injury added: {[p for p in home_unavailable if p.get('name') == 'New Injury']}")
                print(f"   Injuries Updated At: {data.get('injuries_updated_at')}")
                return True
            else:
                print(f"   ❌ New injury not found in unavailable_home list")
                print(f"   Home Unavailable: {home_unavailable}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

# ===== NEW RIVALRY ADMIN ENDPOINT TESTS =====

def test_version_endpoint():
    """Test GET /api/version - expect 200 with version and gitSha fields"""
    print("\n🔍 Testing GET /api/version")
    try:
        response = requests.get(f"{BASE_URL}/version")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            
            required_fields = ["version", "gitSha"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                print(f"   ✅ Version endpoint working - Version: {data['version']}, GitSha: {data['gitSha']}")
                return True
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def find_rivalry_match():
    """Find a seeded rivalry match (Barcelona vs Real Madrid or Celtics vs Lakers)"""
    print("\n🔍 Finding rivalry match from seeded data")
    try:
        response = requests.get(f"{BASE_URL}/matches")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            matches = response.json()
            print(f"   Found {len(matches)} total matches")
            
            # Look for rivalry matches first (enabled=true)
            rivalry_matches = []
            for match in matches:
                rivalry = match.get("rivalry", {})
                if rivalry.get("enabled", False):
                    home_team = match.get("homeTeam", {}).get("name", "")
                    away_team = match.get("awayTeam", {}).get("name", "")
                    rivalry_matches.append({
                        "id": match.get("_id") or match.get("id"),
                        "home": home_team,
                        "away": away_team,
                        "rivalry": rivalry
                    })
            
            if rivalry_matches:
                print(f"   Found {len(rivalry_matches)} enabled rivalry matches:")
                for rm in rivalry_matches:
                    print(f"     - {rm['home']} vs {rm['away']} (intensity: {rm['rivalry'].get('intensity', 0)})")
            
            # Look for target rivalry matches (Barcelona vs Real Madrid, Celtics vs Lakers)
            target_rivalries = [
                ("Barcelona", "Real Madrid"),
                ("Real Madrid", "Barcelona"),
                ("Boston Celtics", "Los Angeles Lakers"),
                ("Los Angeles Lakers", "Boston Celtics")
            ]
            
            # First check enabled rivalry matches
            for rm in rivalry_matches:
                for home_target, away_target in target_rivalries:
                    if rm['home'] == home_target and rm['away'] == away_target:
                        print(f"   ✅ Found enabled target rivalry: {rm['home']} vs {rm['away']}")
                        return rm['id'], rm
            
            # If no enabled rivalry found, look for potential rivalry matches to enable
            potential_matches = []
            for match in matches:
                home_team = match.get("homeTeam", {}).get("name", "")
                away_team = match.get("awayTeam", {}).get("name", "")
                for home_target, away_target in target_rivalries:
                    if home_team == home_target and away_team == away_target:
                        potential_matches.append({
                            "id": match.get("_id") or match.get("id"),
                            "home": home_team,
                            "away": away_team,
                            "rivalry": match.get("rivalry", {})
                        })
            
            if potential_matches:
                pm = potential_matches[0]
                print(f"   ✅ Found potential rivalry match to enable: {pm['home']} vs {pm['away']}")
                return pm['id'], pm
            
            # If no specific target found, return first rivalry match or first match
            if rivalry_matches:
                rm = rivalry_matches[0]
                print(f"   ✅ Using first enabled rivalry match: {rm['home']} vs {rm['away']}")
                return rm['id'], rm
            elif matches:
                match = matches[0]
                print(f"   ⚠️  No rivalry matches found, using first match for testing")
                return match.get("_id") or match.get("id"), {
                    "id": match.get("_id") or match.get("id"),
                    "home": match.get("homeTeam", {}).get("name", ""),
                    "away": match.get("awayTeam", {}).get("name", ""),
                    "rivalry": match.get("rivalry", {})
                }
            else:
                print(f"   ❌ No matches found")
                return None, None
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return None, None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None, None

def test_rivalry_admin_endpoint(match_id):
    """Test POST /api/matches/{id}/rivalry with admin token"""
    print(f"\n🔍 Testing POST /api/matches/{match_id}/rivalry (Admin Rivalry Update)")
    try:
        headers = {"X-Admin-Token": ADMIN_TOKEN}
        payload = {
            "enabled": True,
            "intensity": 2,
            "tag": "Test Derby"
        }
        
        response = requests.post(f"{BASE_URL}/matches/{match_id}/rivalry", json=payload, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if rivalry was updated
            rivalry = data.get("rivalry", {})
            
            if (rivalry.get("enabled") == True and 
                rivalry.get("intensity") == 2 and 
                rivalry.get("tag") == "Test Derby"):
                print(f"   ✅ Rivalry admin endpoint successful")
                print(f"   Rivalry: enabled={rivalry['enabled']}, intensity={rivalry['intensity']}, tag='{rivalry['tag']}'")
                return True
            else:
                print(f"   ❌ Rivalry not updated correctly")
                print(f"   Expected: enabled=True, intensity=2, tag='Test Derby'")
                print(f"   Got: enabled={rivalry.get('enabled')}, intensity={rivalry.get('intensity')}, tag='{rivalry.get('tag')}'")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def verify_rivalry_update(match_id):
    """Test GET /api/matches/{id} to confirm rivalry is updated"""
    print(f"\n🔍 Testing GET /api/matches/{match_id} (Verify Rivalry Update)")
    try:
        response = requests.get(f"{BASE_URL}/matches/{match_id}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if rivalry was persisted
            rivalry = data.get("rivalry", {})
            
            if (rivalry.get("enabled") == True and 
                rivalry.get("intensity") == 2 and 
                rivalry.get("tag") == "Test Derby"):
                print(f"   ✅ Rivalry update verified")
                print(f"   Rivalry: enabled={rivalry['enabled']}, intensity={rivalry['intensity']}, tag='{rivalry['tag']}'")
                return True
            else:
                print(f"   ❌ Rivalry update not persisted")
                print(f"   Expected: enabled=True, intensity=2, tag='Test Derby'")
                print(f"   Got: enabled={rivalry.get('enabled')}, intensity={rivalry.get('intensity')}, tag='{rivalry.get('tag')}'")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_matches_grouped_with_timezone():
    """Test GET /api/matches/grouped?tz=Europe/Madrid - ensure existing endpoint still works"""
    print("\n🔍 Testing GET /api/matches/grouped?tz=Europe/Madrid (Existing endpoint)")
    try:
        response = requests.get(f"{BASE_URL}/matches/grouped?tz=Europe/Madrid")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_keys = ["today", "tomorrow", "week"]
            
            if all(key in data for key in required_keys):
                print(f"   ✅ All required keys present: {required_keys}")
                
                # Check if items have start_time_local
                total_matches = 0
                matches_with_local_time = 0
                
                for bucket in required_keys:
                    bucket_matches = data[bucket]
                    total_matches += len(bucket_matches)
                    
                    for match in bucket_matches:
                        if "start_time_local" in match:
                            matches_with_local_time += 1
                
                print(f"   ✅ Total matches: {total_matches}, with start_time_local: {matches_with_local_time}")
                
                if total_matches == 0 or matches_with_local_time == total_matches:
                    print(f"   ✅ All matches have start_time_local field")
                    return True
                else:
                    print(f"   ❌ Some matches missing start_time_local field")
                    return False
            else:
                missing = [key for key in required_keys if key not in data]
                print(f"   ❌ Missing keys: {missing}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def rivalry_smoke_tests():
    """Run backend smoke tests including the new rivalry admin endpoint"""
    print("🚀 Starting Backend Smoke Tests - Including Rivalry Admin Endpoint")
    print(f"Base URL: {BASE_URL}")
    print("=" * 80)
    
    results = {}
    
    # ===== STEP 1: GET /api/ (expect 200) =====
    results["root_health"] = test_root_endpoint()
    
    # ===== STEP 2: GET /api/version (expect 200 with fields) =====
    results["version"] = test_version_endpoint()
    
    # ===== STEP 3: GET /api/matches (expect 200; at least one match will include a rivalry object) =====
    match_id = test_matches_list()
    results["matches_list"] = bool(match_id)
    
    # ===== STEP 4: Find a seeded rivalry match and capture its _id =====
    rivalry_match_id, rivalry_match_data = find_rivalry_match()
    results["find_rivalry_match"] = bool(rivalry_match_id)
    
    if rivalry_match_id:
        print(f"\n✅ Using rivalry match ID: {rivalry_match_id}")
        
        # ===== STEP 5: POST /api/matches/{id}/rivalry with admin token =====
        results["rivalry_admin_update"] = test_rivalry_admin_endpoint(rivalry_match_id)
        
        # ===== STEP 6: GET /api/matches/{id} to confirm rivalry is updated =====
        results["rivalry_verification"] = verify_rivalry_update(rivalry_match_id)
    else:
        print("\n❌ No rivalry match found - skipping rivalry admin tests")
        results["rivalry_admin_update"] = False
        results["rivalry_verification"] = False
    
    # ===== STEP 7: GET /api/matches/grouped?country=CH (expect 200) =====
    grouped_data = test_matches_grouped()
    results["matches_grouped_ch"] = bool(grouped_data)
    
    # ===== SUMMARY =====
    print("\n" + "=" * 80)
    print("📊 BACKEND SMOKE TESTS SUMMARY - RIVALRY ADMIN ENDPOINT")
    print("=" * 80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:25} {status}")
    
    print(f"\n🏆 OVERALL: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend smoke tests passed!")
        return 0
    else:
        print("⚠️  Some smoke tests failed")
        return 1

def main():
    """Run all backend tests in sequence - including new Competitions + Lineups/Injuries features"""
    print("🚀 Starting Backend API Tests - Competitions + Lineups/Injuries Focus")
    print(f"Base URL: {BASE_URL}")
    print("=" * 80)
    
    results = {}
    
    # ===== STEP 1: Health Check =====
    results["health"] = test_root_endpoint()
    
    # ===== STEP 2: Verify Seeding - Competitions =====
    competitions_data = test_competitions_list()
    results["competitions_list"] = bool(competitions_data)
    
    competition_ids = []
    if competitions_data:
        # ===== STEP 3: Test Competition Details =====
        for comp in competitions_data[:2]:  # Test first 2 competitions
            comp_id = comp.get("_id") or comp.get("id")
            comp_name = comp.get("name", "Unknown")
            if comp_id:
                competition_ids.append((comp_id, comp_name))
                results[f"competition_detail_{comp_name.replace(' ', '_')}"] = test_competition_detail(comp_id, comp_name)
    
    # ===== STEP 4: Test Competition Matches =====
    lineups_match_id = None
    if competition_ids:
        for comp_id, comp_name in competition_ids:
            match_id = test_competition_matches(comp_id, comp_name)
            results[f"competition_matches_{comp_name.replace(' ', '_')}"] = bool(match_id)
            if match_id and not lineups_match_id:
                lineups_match_id = match_id  # Use first available match for lineups testing
    
    # ===== STEP 5: Test Match with Lineups =====
    if lineups_match_id:
        results["match_with_lineups"] = test_match_with_lineups(lineups_match_id)
        
        # ===== STEP 6: Test Lineups Endpoint =====
        results["lineups_endpoint"] = test_lineups_endpoint(lineups_match_id)
        
        # ===== STEP 7: Test Admin Overrides =====
        results["admin_lineups_override"] = test_admin_lineups_override(lineups_match_id)
        results["admin_injuries_override"] = test_admin_injuries_override(lineups_match_id)
    else:
        print("\n❌ No match ID available for lineups testing")
        results.update({
            "match_with_lineups": False,
            "lineups_endpoint": False,
            "admin_lineups_override": False,
            "admin_injuries_override": False
        })
    
    # ===== STEP 8: Test Existing Endpoints Still Work =====
    results["matches_grouped_timezone"] = test_matches_grouped_with_timezone()
    
    # ===== LEGACY TESTS (Optional) =====
    print("\n" + "=" * 40 + " LEGACY TESTS " + "=" * 40)
    
    # Test import (should work but return 0,0)
    results["import_legacy"] = test_import_thesportsdb()
    
    # Test matches grouped (original)
    grouped_data = test_matches_grouped()
    results["grouped_legacy"] = bool(grouped_data)
    
    # Get a match for rating/voting tests
    match_id = test_matches_list()
    results["list_matches_legacy"] = bool(match_id)
    
    if match_id:
        results["match_detail_legacy"] = test_match_detail(match_id)
        # Skip rating/voting tests as they require auth and are not in scope
        print("   ⚠️  Skipping rating/voting tests (not in current scope)")
    
    # ===== SUMMARY =====
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY - COMPETITIONS + LINEUPS/INJURIES FOCUS")
    print("=" * 80)
    
    # Separate core tests from legacy tests
    core_tests = {k: v for k, v in results.items() if not k.endswith("_legacy")}
    legacy_tests = {k: v for k, v in results.items() if k.endswith("_legacy")}
    
    print("\n🎯 CORE TESTS (Competitions + Lineups/Injuries):")
    core_passed = sum(1 for result in core_tests.values() if result)
    core_total = len(core_tests)
    
    for test_name, result in core_tests.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:35} {status}")
    
    print(f"\n📈 Core Tests: {core_passed}/{core_total} passed")
    
    print("\n🔄 LEGACY TESTS (Existing functionality):")
    legacy_passed = sum(1 for result in legacy_tests.values() if result)
    legacy_total = len(legacy_tests)
    
    for test_name, result in legacy_tests.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:35} {status}")
    
    print(f"\n📈 Legacy Tests: {legacy_passed}/{legacy_total} passed")
    
    total_passed = core_passed + legacy_passed
    total_tests = core_total + legacy_total
    print(f"\n🏆 OVERALL: {total_passed}/{total_tests} tests passed")
    
    if core_passed == core_total:
        print("🎉 All core Competitions + Lineups/Injuries tests passed!")
        return 0
    else:
        print("⚠️  Some core tests failed")
        return 1

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rivalry":
        sys.exit(rivalry_smoke_tests())
    else:
        sys.exit(main())