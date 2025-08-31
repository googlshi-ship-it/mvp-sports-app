#!/usr/bin/env python3
"""
Focused Re-test for GET /api/matches/grouped endpoint
Testing only the two specific scenarios requested:
1. GET /api/matches/grouped?tz=Europe/Madrid
2. GET /api/matches/grouped?country=CH
"""

import requests
import json
from datetime import datetime, timezone
import sys

# Base URL from frontend/.env EXPO_PUBLIC_BACKEND_URL
BASE_URL = "https://fanmvp-ratings.preview.emergentagent.com/api"

def test_matches_grouped_timezone():
    """Test GET /api/matches/grouped?tz=Europe/Madrid"""
    print("🔍 Testing GET /api/matches/grouped?tz=Europe/Madrid")
    try:
        response = requests.get(f"{BASE_URL}/matches/grouped?tz=Europe/Madrid")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response keys: {list(data.keys())}")
            
            # Check required keys
            required_keys = ["today", "tomorrow", "week"]
            if all(key in data for key in required_keys):
                print(f"   ✅ All required keys present: {required_keys}")
                
                # Check if arrays are present and log details
                total_matches = 0
                for key in required_keys:
                    if isinstance(data[key], list):
                        count = len(data[key])
                        total_matches += count
                        print(f"   ✅ {key}: {count} matches (array)")
                        
                        # Check first match in each bucket for expected fields
                        if count > 0:
                            match = data[key][0]
                            if "start_time_local" in match:
                                print(f"      First match has start_time_local: {match['start_time_local']}")
                            else:
                                print(f"      ❌ First match missing start_time_local")
                    else:
                        print(f"   ❌ {key} is not an array")
                        return False
                
                print(f"   ✅ Total matches across all buckets: {total_matches}")
                return True
            else:
                missing = [key for key in required_keys if key not in data]
                print(f"   ❌ Missing keys: {missing}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response body: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_matches_grouped_country():
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
                
                # Check if arrays are present and log details
                total_matches = 0
                for key in required_keys:
                    if isinstance(data[key], list):
                        count = len(data[key])
                        total_matches += count
                        print(f"   ✅ {key}: {count} matches (array)")
                        
                        # Check first match in each bucket for channelsForCountry
                        if count > 0:
                            match = data[key][0]
                            if "channelsForCountry" in match:
                                channels = match["channelsForCountry"]
                                print(f"      First match channelsForCountry: {channels}")
                            else:
                                print(f"      ❌ First match missing channelsForCountry")
                    else:
                        print(f"   ❌ {key} is not an array")
                        return False
                
                print(f"   ✅ Total matches across all buckets: {total_matches}")
                return True
            else:
                missing = [key for key in required_keys if key not in data]
                print(f"   ❌ Missing keys: {missing}")
                return False
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
            print(f"   Response body: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Run the focused re-test for GET /api/matches/grouped endpoint"""
    print("🚀 Focused Re-test: GET /api/matches/grouped endpoint")
    print(f"Base URL: {BASE_URL}")
    print("=" * 70)
    
    results = {}
    
    # Test 1: GET /api/matches/grouped?tz=Europe/Madrid
    results["timezone_test"] = test_matches_grouped_timezone()
    
    # Test 2: GET /api/matches/grouped?country=CH
    results["country_test"] = test_matches_grouped_country()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 FOCUSED TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:25} {status}")
    
    print(f"\n🏆 RESULT: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All focused tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())