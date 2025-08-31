#!/usr/bin/env python3
"""
Backend API Testing Script for Sports MVP App
Tests all backend endpoints according to test_result.md requirements
"""

import requests
import json
from datetime import datetime, timezone
import sys

# Base URL from frontend/.env EXPO_PUBLIC_BACKEND_URL
BASE_URL = "https://fanmvp-ratings.preview.emergentagent.com/api"

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