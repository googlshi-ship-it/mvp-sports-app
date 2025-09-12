#!/usr/bin/env python3
"""
Backend Smoke Tests for Sports MVP App
Focused smoke tests as requested in latest agent communication
"""

import requests
import json
from datetime import datetime, timezone
import sys

# Base URL from frontend/.env EXPO_PUBLIC_BACKEND_URL
BASE_URL = "https://rivalfootball.preview.emergentagent.com/api"

def test_root_health():
    """Test GET /api/ - expect 200, JSON with {message}"""
    print("🔍 Testing GET /api/ (Root health check)")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            if isinstance(data, dict) and "message" in data:
                print("   ✅ Root endpoint working correctly - has message field")
                return True
            else:
                print(f"   ❌ Expected JSON with message field, got: {data}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_version():
    """Test GET /api/version - expect 200 and {version, gitSha}"""
    print("\n🔍 Testing GET /api/version")
    try:
        response = requests.get(f"{BASE_URL}/version")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            
            if isinstance(data, dict) and "version" in data and "gitSha" in data:
                print(f"   ✅ Version endpoint working - Version: {data['version']}, GitSha: {data['gitSha']}")
                return True
            else:
                print(f"   ❌ Expected JSON with version and gitSha fields, got: {data}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_competitions_list():
    """Test GET /api/competitions - expect 200, array length >= 2"""
    print("\n🔍 Testing GET /api/competitions")
    try:
        response = requests.get(f"{BASE_URL}/competitions")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response type: {type(data)}, Length: {len(data) if isinstance(data, list) else 'N/A'}")
            
            if isinstance(data, list) and len(data) >= 2:
                print(f"   ✅ Competitions list working - Found {len(data)} competitions")
                # Print competition names for verification
                names = [comp.get("name", "Unknown") for comp in data]
                print(f"   Competition names: {names}")
                return data  # Return data for next test
            else:
                print(f"   ❌ Expected array with length >= 2, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
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
                print(f"   ✅ Competition detail working - All required fields present")
                print(f"   Name: {data['name']}, Country: {data['country']}, Season: {data['season']}, Type: {data['type']}")
                return True
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                print(f"   Available fields: {list(data.keys())}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_competition_matches(comp_id, comp_name):
    """Test GET /api/competitions/{id}/matches?tz=Europe/Zurich - expect 200, array with proper fields"""
    print(f"\n🔍 Testing GET /api/competitions/{comp_id}/matches?tz=Europe/Zurich ({comp_name})")
    try:
        response = requests.get(f"{BASE_URL}/competitions/{comp_id}/matches?tz=Europe/Zurich")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response type: {type(data)}, Length: {len(data) if isinstance(data, list) else 'N/A'}")
            
            if isinstance(data, list):
                print(f"   ✅ Competition matches working - Found {len(data)} matches")
                
                if len(data) > 0:
                    # Check first match for required fields
                    match = data[0]
                    required_fields = ["_id", "startTime", "start_time_local", "competition_id"]
                    
                    missing_fields = [field for field in required_fields if field not in match]
                    if not missing_fields:
                        print(f"   ✅ Match has required fields: _id, startTime, start_time_local, competition_id")
                        print(f"   Match ID: {match['_id']}")
                        print(f"   Start Time: {match['startTime']}")
                        print(f"   Start Time Local: {match['start_time_local']}")
                        print(f"   Competition ID: {match['competition_id']} (matches: {str(comp_id)})")
                        
                        # Verify competition_id matches
                        if str(match['competition_id']) == str(comp_id):
                            print(f"   ✅ Competition ID matches expected value")
                            return True
                        else:
                            print(f"   ❌ Competition ID mismatch: got {match['competition_id']}, expected {comp_id}")
                            return False
                    else:
                        print(f"   ❌ Missing required fields in match: {missing_fields}")
                        print(f"   Available fields: {list(match.keys())}")
                        return False
                else:
                    print(f"   ⚠️  No matches found for {comp_name} (this is acceptable)")
                    return True
            else:
                print(f"   ❌ Expected array, got: {type(data)}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_matches_list():
    """Test GET /api/matches - expect 200, array with isVotingOpen and start_time_local fields"""
    print("\n🔍 Testing GET /api/matches")
    try:
        response = requests.get(f"{BASE_URL}/matches")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response type: {type(data)}, Length: {len(data) if isinstance(data, list) else 'N/A'}")
            
            if isinstance(data, list):
                print(f"   ✅ Matches list working - Found {len(data)} matches")
                
                if len(data) > 0:
                    # Check first match for required fields
                    match = data[0]
                    
                    # Check for isVotingOpen field
                    if "isVotingOpen" in match:
                        print(f"   ✅ Match has isVotingOpen field: {match['isVotingOpen']}")
                    else:
                        print(f"   ❌ Missing isVotingOpen field")
                        return False
                    
                    # Check for start_time_local field (may be null without tz)
                    if "start_time_local" in match:
                        print(f"   ✅ Match has start_time_local field: {match['start_time_local']} (may be null without tz)")
                    else:
                        print(f"   ❌ Missing start_time_local field")
                        return False
                    
                    return True
                else:
                    print(f"   ⚠️  No matches found (this is acceptable)")
                    return True
            else:
                print(f"   ❌ Expected array, got: {type(data)}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_matches_grouped():
    """Test GET /api/matches/grouped?country=CH - expect 200, object with today/tomorrow/week arrays"""
    print("\n🔍 Testing GET /api/matches/grouped?country=CH")
    try:
        response = requests.get(f"{BASE_URL}/matches/grouped?country=CH")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response type: {type(data)}")
            
            if isinstance(data, dict):
                required_keys = ["today", "tomorrow", "week"]
                missing_keys = [key for key in required_keys if key not in data]
                
                if not missing_keys:
                    print(f"   ✅ Matches grouped working - All required keys present: {required_keys}")
                    
                    # Check that each key contains an array
                    for key in required_keys:
                        if isinstance(data[key], list):
                            print(f"   ✅ {key}: {len(data[key])} matches (array)")
                        else:
                            print(f"   ❌ {key} is not an array: {type(data[key])}")
                            return False
                    
                    return True
                else:
                    print(f"   ❌ Missing required keys: {missing_keys}")
                    print(f"   Available keys: {list(data.keys())}")
                    return False
            else:
                print(f"   ❌ Expected object, got: {type(data)}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Run backend smoke tests as requested"""
    print("🚀 Starting Backend Smoke Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 80)
    
    results = {}
    
    # Step 1: GET /api/ (expect 200, JSON with {message})
    results["root_health"] = test_root_health()
    
    # Step 2: GET /api/version (expect 200 and {version, gitSha})
    results["version"] = test_version()
    
    # Step 3: GET /api/competitions (expect 200, array length >= 2)
    competitions_data = test_competitions_list()
    results["competitions_list"] = bool(competitions_data)
    
    # Step 4: Take first _id from competitions; GET /api/competitions/{id}
    if competitions_data and len(competitions_data) > 0:
        first_comp = competitions_data[0]
        comp_id = first_comp.get("_id") or first_comp.get("id")
        comp_name = first_comp.get("name", "Unknown")
        
        if comp_id:
            results["competition_detail"] = test_competition_detail(comp_id, comp_name)
            
            # Step 5: GET /api/competitions/{id}/matches?tz=Europe/Zurich
            results["competition_matches"] = test_competition_matches(comp_id, comp_name)
        else:
            print("\n❌ No competition ID found in first competition")
            results["competition_detail"] = False
            results["competition_matches"] = False
    else:
        print("\n❌ No competitions data available for detail/matches tests")
        results["competition_detail"] = False
        results["competition_matches"] = False
    
    # Step 6: GET /api/matches (expect 200, array; items include isVotingOpen, start_time_local may be null without tz)
    results["matches_list"] = test_matches_list()
    
    # Step 7: GET /api/matches/grouped?country=CH (expect 200, object with today/tomorrow/week arrays)
    results["matches_grouped"] = test_matches_grouped()
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 SMOKE TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:25} {status}")
    
    print(f"\n🏆 OVERALL: {passed}/{total} smoke tests passed")
    
    if passed == total:
        print("🎉 All smoke tests passed!")
        return 0
    else:
        print("⚠️  Some smoke tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())