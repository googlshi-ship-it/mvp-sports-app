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
BASE_URL = "https://fanmvp-ratings.preview.emergentagent.com/api"
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

def main():
    """Run all backend tests in sequence"""
    print("🚀 Starting Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    results = {}
    match_id = None
    
    # Test 1: Root endpoint
    results["root"] = test_root_endpoint()
    
    # Test 2: Import TheSportsDB
    results["import"] = test_import_thesportsdb()
    
    # Test 3: Matches grouped
    grouped_data = test_matches_grouped()
    results["grouped"] = bool(grouped_data)
    
    # Test 4: Check if we need to create a manual match
    if grouped_data:
        total_matches = len(grouped_data.get("today", [])) + len(grouped_data.get("tomorrow", [])) + len(grouped_data.get("week", []))
        if total_matches == 0:
            print("\n⚠️  No matches found in grouped data, creating manual match...")
            match_id = create_manual_match()
            results["manual_match"] = bool(match_id)
    
    # Test 5: List matches
    if not match_id:
        match_id = test_matches_list()
    results["list_matches"] = bool(match_id)
    
    if match_id:
        # Test 6: Match detail
        results["match_detail"] = test_match_detail(match_id)
        
        # Test 7: Match rating
        results["match_rating"] = test_match_rating(match_id)
        
        # Test 8: Match voting
        results["match_voting"] = test_match_voting(match_id)
        
        # Test 9: Get votes
        results["match_votes"] = test_match_votes(match_id)
    else:
        print("\n❌ No match ID available for detailed testing")
        results.update({
            "match_detail": False,
            "match_rating": False,
            "match_voting": False,
            "match_votes": False
        })
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())