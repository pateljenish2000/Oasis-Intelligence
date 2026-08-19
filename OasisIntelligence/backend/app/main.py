import json
from typing import Optional, Dict, Any, Union
from fastapi import FastAPI, Query, Body, HTTPException, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pymysql.cursors
from app.db import get_db

app = FastAPI(title="Oasis Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str

class CreateViewRequest(BaseModel):
    userId: Union[int, str]
    title: str
    filters: Dict[str, Any]

@app.get("/test", response_class=PlainTextResponse)
def test_backend():
    return "Backend works"

@app.get("/api/countries")
def get_countries():
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT countryId, countryName FROM Countries")
                return cursor.fetchall()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.post("/api/login")
def login(body: LoginRequest):
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT userId, email, password FROM Users WHERE email = %s", (body.email,))
                row = cursor.fetchone()
                if row and row["password"] == body.password:
                    return JSONResponse(status_code=200, content={"userId": row["userId"], "email": row["email"]})
                return JSONResponse(status_code=401, content={"error": "Invalid email or password"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.post("/api/signup")
def signup(body: SignupRequest):
    if not body.email or not body.email.strip() or not body.password or not body.password.strip():
        return JSONResponse(status_code=400, content={"error": "Missing email or password"})
    
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT userId FROM Users WHERE email = %s", (body.email,))
                if cursor.fetchone():
                    return JSONResponse(status_code=409, content={"error": "An account with this email already exists"})
                
                cursor.execute("SELECT COALESCE(MAX(userId), 0) + 1 AS nextId FROM Users")
                id_row = cursor.fetchone()
                new_user_id = id_row["nextId"] if id_row else 1
                
                cursor.execute(
                    "INSERT INTO Users (userId, email, password) VALUES (%s, %s, %s)",
                    (new_user_id, body.email, body.password)
                )
                conn.commit()
                return JSONResponse(status_code=201, content={"userId": new_user_id, "email": body.email})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.get("/api/views")
def get_views(userId: int = Query(...)):
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT viewId, userId, title, filters FROM SavedViews WHERE userId = %s", (userId,))
                rows = cursor.fetchall()
                for r in rows:
                    if isinstance(r["filters"], str):
                        try:
                            r["filters"] = json.loads(r["filters"])
                        except Exception:
                            pass
                return rows
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.get("/api/views/logs")
def get_view_logs(userId: int = Query(...), limit: int = Query(10, ge=1, le=50)):
    """Get view logs."""
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT logId, viewId, userId, actionType, actionTime, message
                    FROM SavedViewLogs
                    WHERE userId = %s
                    ORDER BY actionTime DESC, logId DESC
                    LIMIT %s
                    """,
                    (userId, limit)
                )
                return cursor.fetchall()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})


@app.post("/api/views")
def create_view(body: CreateViewRequest):
    if not body.title or not body.title.strip() or not body.filters:
        return JSONResponse(status_code=400, content={"error": "Missing userId, title, or filters"})
    
    try:
        user_id_int = int(body.userId)
        filters_json = json.dumps(body.filters)
        
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(
                    "INSERT INTO SavedViews (userId, title, filters) VALUES (%s, %s, %s)",
                    (user_id_int, body.title, filters_json)
                )
                conn.commit()
                return JSONResponse(status_code=201, content={
                    "viewId": cursor.lastrowid,
                    "userId": user_id_int,
                    "title": body.title,
                    "filters": body.filters
                })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.delete("/api/views/{viewId}")
def delete_view(viewId: int, userId: int = Query(...)):
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("DELETE FROM SavedViews WHERE viewId = %s AND userId = %s", (viewId, userId))
                conn.commit()
                if cursor.rowcount == 0:
                    return JSONResponse(status_code=404, content={"error": "View not found"})
                return Response(status_code=204)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.put("/api/views/{viewId}")
def update_view(viewId: int, body: CreateViewRequest):
    if not body.userId or not body.title or not body.filters:
        return JSONResponse(status_code=400, content={"error": "Missing userId, title, or filters"})
    
    try:
        user_id_int = int(body.userId)
        filters_json = json.dumps(body.filters)
        
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(
                    "UPDATE SavedViews SET title = %s, filters = %s WHERE viewId = %s AND userId = %s",
                    (body.title, filters_json, viewId, user_id_int)
                )
                conn.commit()
                if cursor.rowcount == 0:
                    return JSONResponse(status_code=404, content={"error": "View not found or unauthorized"})
                return JSONResponse(status_code=200, content={
                    "viewId": viewId,
                    "userId": user_id_int,
                    "title": body.title,
                    "filters": body.filters
                })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.get("/api/search")
def keyword_search(q: str = Query(..., min_length=1), userId: int = Query(0)):
    try:
        kw = f"%{q.strip()}%"
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = """
                SELECT 'crop' AS type, cropId AS id, cropName AS title, '' AS subtitle FROM Crops WHERE cropName LIKE %s
                UNION ALL
                SELECT 'country' AS type, countryId AS id, countryName AS title, '' AS subtitle FROM Countries WHERE countryName LIKE %s
                UNION ALL
                SELECT 'preset' AS type, viewId AS id, title, filters AS subtitle FROM SavedViews WHERE (title LIKE %s OR filters LIKE %s) AND userId = %s
                LIMIT 30
                """
                cursor.execute(sql, (kw, kw, kw, kw, userId))
                rows = cursor.fetchall()
                for r in rows:
                    if r["type"] == "preset" and r.get("subtitle"):
                        try:
                            f_dict = json.loads(r["subtitle"])
                            r["subtitle"] = f"{f_dict.get('element', '')} ({f_dict.get('yearRange', [1990, 2024])[0]}-{f_dict.get('yearRange', [1990, 2024])[1]})"
                        except Exception:
                            r["subtitle"] = "Saved Query"
                return rows
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.post("/api/analytics/snapshot")
def create_analytics_snapshot(userId: int = Query(...), payload: Optional[dict] = Body(None)):
    try:
        payload = payload or {}
        req_crop_ids = payload.get("cropIds") or []
        req_country_ids = payload.get("countryIds") or []
        req_element = payload.get("element") or "Yield (kg/ha)"
        req_year_range = payload.get("yearRange") or [2015, 2024]
        
        y_start, y_end = req_year_range[0], req_year_range[1]

        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
                cursor.execute("START TRANSACTION")
                
                if not req_crop_ids:
                    cursor.execute("SELECT DISTINCT cropId FROM ProductionRecords WHERE year BETWEEN %s AND %s ORDER BY recordId ASC LIMIT 3", (y_start, y_end))
                    req_crop_ids = [r["cropId"] for r in cursor.fetchall()]
                
                if not req_country_ids:
                    cursor.execute("SELECT DISTINCT countryId FROM ProductionRecords WHERE year BETWEEN %s AND %s ORDER BY recordId ASC LIMIT 3", (y_start, y_end))
                    req_country_ids = [r["countryId"] for r in cursor.fetchall()]

                agg_sql = """
                SELECT 
                    pr.element,
                    ROUND(AVG(pr.value), 2) AS benchmarkAverage,
                    COUNT(DISTINCT pr.countryId) AS totalCountries,
                    COUNT(DISTINCT pr.cropId) AS totalCrops
                FROM ProductionRecords pr
                JOIN Crops cr ON pr.cropId = cr.cropId
                JOIN Countries co ON pr.countryId = co.countryId
                WHERE pr.year BETWEEN %s AND %s
                GROUP BY pr.element
                """
                cursor.execute(agg_sql, (y_start, y_end))
                raw_benchmarks = cursor.fetchall()
                
                benchmarks = []
                for b in raw_benchmarks:
                    benchmarks.append({
                        "element": b.get("element") or "All",
                        "benchmarkAverage": float(b.get("benchmarkAverage") or 0.0),
                        "totalCountries": int(b.get("totalCountries") or 0),
                        "totalCrops": int(b.get("totalCrops") or 0)
                    })
                
                filters_payload = {
                    "element": req_element,
                    "yearRange": [y_start, y_end],
                    "cropIds": req_crop_ids,
                    "countryIds": req_country_ids,
                    "snapshotBenchmarks": benchmarks
                }
                filters_json = json.dumps(filters_payload)
                
                title = f"Snapshot ({req_element}) - {y_start}-{y_end}"
                cursor.execute(
                    "INSERT INTO SavedViews (userId, title, filters) VALUES (%s, %s, %s)",
                    (userId, title, filters_json)
                )
                new_id = cursor.lastrowid
                conn.commit()
                return JSONResponse(status_code=201, content={
                    "snapshotId": new_id,
                    "benchmarksCount": len(benchmarks),
                    "benchmarks": benchmarks
                })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.get("/api/reports/efficiency")
def get_efficiency_report(
    yearStart: int = Query(2000),
    yearEnd: int = Query(2024),
    minYield: float = Query(2000.0)
):
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("CALL GetCropEfficiencyReport(%s, %s, %s)", (yearStart, yearEnd, minYield))
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    results.append({
                        "cropId": int(r["cropId"]),
                        "cropName": r["cropName"],
                        "reportingCountries": int(r["reportingCountries"]),
                        "avgYieldKgPerHa": float(r.get("avgYieldKgPerHa") or 0.0),
                        "peakYieldKgPerHa": float(r.get("peakYieldKgPerHa") or 0.0),
                        "earliestYear": int(r["earliestYear"]),
                        "latestYear": int(r["latestYear"]),
                        "efficiencyClassification": r["efficiencyClassification"]
                    })
                return results
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

# Production records endpoints

class ProductionRecordPayload(BaseModel):
    cropId: int
    countryId: int
    element: str
    year: int
    value: float

@app.post("/api/production")
def create_production_record(payload: ProductionRecordPayload):
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO ProductionRecords (cropId, countryId, element, year, value) VALUES (%s, %s, %s, %s, %s)",
                    (payload.cropId, payload.countryId, payload.element, payload.year, payload.value)
                )
                new_id = cursor.lastrowid
                conn.commit()
                return JSONResponse(status_code=201, content={"recordId": new_id, "message": "Production record inserted successfully"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.put("/api/production/{recordId}")
def update_production_record(recordId: int, payload: ProductionRecordPayload):
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE ProductionRecords SET cropId=%s, countryId=%s, element=%s, year=%s, value=%s WHERE recordId=%s",
                    (payload.cropId, payload.countryId, payload.element, payload.year, payload.value, recordId)
                )
                conn.commit()
                return {"recordId": recordId, "message": "Production record updated successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.delete("/api/production/{recordId}")
def delete_production_record(recordId: int):
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM ProductionRecords WHERE recordId = %s", (recordId,))
                conn.commit()
                return JSONResponse(status_code=204, content=None)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})


@app.get("/api/production")
def get_production(
    cropIds: str = Query(...),
    countryIds: str = Query(...),
    element: str = Query(...),
    yearStart: int = Query(...),
    yearEnd: int = Query(...)
):
    try:
        crop_list = [int(s.strip()) for s in cropIds.split(",")]
        country_list = [int(s.strip()) for s in countryIds.split(",")]
        
        crop_placeholders = ",".join(["%s"] * len(crop_list))
        country_placeholders = ",".join(["%s"] * len(country_list))
        
        sql = f"""
            SELECT pr.recordId, cr.cropName, co.countryName, pr.element, pr.unit, pr.value, pr.year
            FROM ProductionRecords pr
            JOIN Crops cr ON pr.cropId = cr.cropId
            JOIN Countries co ON pr.countryId = co.countryId
            WHERE pr.cropId IN ({crop_placeholders})
              AND pr.countryId IN ({country_placeholders})
              AND pr.element = %s
              AND pr.year BETWEEN %s AND %s
            ORDER BY pr.year
        """
        params = [*crop_list, *country_list, element, yearStart, yearEnd]
        
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(sql, params)
                return cursor.fetchall()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.get("/api/crops")
def get_crops():
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT cropId, cropName FROM Crops")
                return cursor.fetchall()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})

@app.get("/api/elements")
def get_elements():
    try:
        with get_db() as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT element FROM ProductionRecords ORDER BY element")
                rows = cursor.fetchall()
                return [
                    row["element"]
                    for row in rows
                    if row.get("element") and row["element"].lower() != "element"
                ]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})
