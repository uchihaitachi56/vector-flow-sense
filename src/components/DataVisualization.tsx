import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClimateData } from "@/pages/Index";
import { MapPin, Wind, Droplets, Thermometer } from "lucide-react";

interface DataVisualizationProps {
  data: ClimateData[];
}

const DataVisualization = ({ data }: DataVisualizationProps) => {
  const stats = useMemo(() => {
    console.log('DataVisualization stats useMemo running, data length:', data.length);
    
    if (!data || data.length === 0) {
      console.log('No data available for stats calculation');
      return null;
    }

    try {
      const totalPoints = data.length;
      
      // Safely get unique locations
      const uniqueLocations = new Set(
        data
          .filter(d => d && typeof d.lat === 'number' && typeof d.lon === 'number')
          .map(d => `${d.lat},${d.lon}`)
      ).size;
      
      // Safely get years for date range
      const validYears = data
        .filter(d => d && typeof d.year === 'number' && !isNaN(d.year))
        .map(d => d.year);
      
      const dateRange = validYears.length > 0 ? {
        start: Math.min(...validYears),
        end: Math.max(...validYears)
      } : { start: 0, end: 0 };
      
      // Safely calculate averages
      const validPrecipitation = data.filter(d => d && typeof d.prec === 'number' && !isNaN(d.prec));
      const validWindSpeed = data.filter(d => d && typeof d.ws10m === 'number' && !isNaN(d.ws10m));
      const validHumidity = data.filter(d => d && typeof d.qv2m === 'number' && !isNaN(d.qv2m));
      
      const avgPrecipitation = validPrecipitation.length > 0 
        ? validPrecipitation.reduce((sum, d) => sum + d.prec, 0) / validPrecipitation.length 
        : 0;
      
      const avgWindSpeed = validWindSpeed.length > 0
        ? validWindSpeed.reduce((sum, d) => sum + d.ws10m, 0) / validWindSpeed.length
        : 0;
      
      const avgHumidity = validHumidity.length > 0
        ? validHumidity.reduce((sum, d) => sum + d.qv2m, 0) / validHumidity.length
        : 0;

      const result = {
        totalPoints,
        uniqueLocations,
        dateRange,
        avgPrecipitation,
        avgWindSpeed,
        avgHumidity
      };
      
      console.log('Stats calculated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error calculating stats:', error);
      return null;
    }
  }, [data]);

  const geographicBounds = useMemo(() => {
    console.log('DataVisualization geographicBounds useMemo running');
    
    if (!data || data.length === 0) {
      console.log('No data available for geographic bounds calculation');
      return null;
    }

    try {
      // Filter for valid latitude and longitude values
      const validCoordinates = data.filter(d => 
        d && 
        typeof d.lat === 'number' && !isNaN(d.lat) && 
        typeof d.lon === 'number' && !isNaN(d.lon)
      );

      if (validCoordinates.length === 0) {
        console.log('No valid coordinates found');
        return null;
      }

      const result = {
        minLat: Math.min(...validCoordinates.map(d => d.lat)),
        maxLat: Math.max(...validCoordinates.map(d => d.lat)),
        minLon: Math.min(...validCoordinates.map(d => d.lon)),
        maxLon: Math.max(...validCoordinates.map(d => d.lon))
      };
      
      console.log('Geographic bounds calculated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error calculating geographic bounds:', error);
      return null;
    }
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No data to visualize. Please upload a CSV file first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Data Points</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.uniqueLocations} unique locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Precipitation</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats?.avgPrecipitation.toFixed(2)} mm</div>
            <p className="text-xs text-muted-foreground">Mean rainfall</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wind Speed</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats?.avgWindSpeed.toFixed(2)} m/s</div>
            <p className="text-xs text-muted-foreground">At 10m height</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Humidity</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.avgHumidity.toFixed(2)} g/kg</div>
            <p className="text-xs text-muted-foreground">Specific humidity</p>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Latitude Range</h4>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{geographicBounds?.minLat.toFixed(2)}°</Badge>
                <span className="text-muted-foreground">to</span>
                <Badge variant="outline">{geographicBounds?.maxLat.toFixed(2)}°</Badge>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Longitude Range</h4>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{geographicBounds?.minLon.toFixed(2)}°</Badge>
                <span className="text-muted-foreground">to</span>
                <Badge variant="outline">{geographicBounds?.maxLon.toFixed(2)}°</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Range */}
      <Card>
        <CardHeader>
          <CardTitle>Temporal Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Start Year</p>
              <p className="text-xl font-bold text-primary">{stats?.dateRange.start}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-xl font-bold text-accent">
                {stats ? stats.dateRange.end - stats.dateRange.start + 1 : 0} years
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">End Year</p>
              <p className="text-xl font-bold text-primary">{stats?.dateRange.end}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sample (First 10 Records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Lat</th>
                  <th className="text-left p-2">Lon</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Wind Speed</th>
                  <th className="text-left p-2">Wind Dir</th>
                  <th className="text-left p-2">Humidity</th>
                  <th className="text-left p-2">Precipitation</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">{row.lat}</td>
                    <td className="p-2">{row.lon}</td>
                    <td className="p-2">{row.month}/{row.date}/{row.year}</td>
                    <td className="p-2">{row.ws10m.toFixed(2)} m/s</td>
                    <td className="p-2">{row.wd10m.toFixed(1)}°</td>
                    <td className="p-2">{row.qv2m.toFixed(2)} g/kg</td>
                    <td className="p-2">{row.prec.toFixed(2)} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataVisualization;