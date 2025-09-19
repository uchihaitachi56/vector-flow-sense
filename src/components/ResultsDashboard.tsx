import { useMemo } from "react";
import { Download, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClimateData } from "@/pages/Index";

interface Anomaly extends ClimateData {
  index: number;
  zScore: number;
  isOutlier: boolean;
  neighbors: number;
  directionalConsistency: number | null;
  isDirectionallyCoherent: boolean | null;
  isTrueAnomaly: boolean;
  confidence: number;
}

interface ResultsDashboardProps {
  anomalies: Anomaly[];
  data: ClimateData[];
}

const ResultsDashboard = ({ anomalies, data }: ResultsDashboardProps) => {
  const stats = useMemo(() => {
    if (anomalies.length === 0) return null;

    const trueAnomalies = anomalies.filter(a => a.isTrueAnomaly);
    const falseAnomalies = anomalies.filter(a => !a.isTrueAnomaly);
    
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    const avgZScore = anomalies.reduce((sum, a) => sum + a.zScore, 0) / anomalies.length;
    
    const avgDirectionalConsistency = anomalies
      .filter(a => a.directionalConsistency !== null)
      .reduce((sum, a) => sum + (a.directionalConsistency || 0), 0) / anomalies.length;

    return {
      total: anomalies.length,
      trueCount: trueAnomalies.length,
      falseCount: falseAnomalies.length,
      truePercentage: (trueAnomalies.length / anomalies.length) * 100,
      avgConfidence,
      avgZScore,
      avgDirectionalConsistency
    };
  }, [anomalies]);

  const exportResults = () => {
    if (anomalies.length === 0) return;

    const csvContent = [
      'Index,Lat,Lon,Year,Month,Date,Precipitation,Wind_Speed,Wind_Direction,Z_Score,Neighbors,Directional_Consistency,Is_True_Anomaly,Confidence',
      ...anomalies.map(anomaly => [
        anomaly.index,
        anomaly.lat,
        anomaly.lon,
        anomaly.year,
        anomaly.month,
        anomaly.date,
        anomaly.prec,
        anomaly.ws10m,
        anomaly.wd10m,
        anomaly.zScore.toFixed(3),
        anomaly.neighbors,
        anomaly.directionalConsistency?.toFixed(3) || 'N/A',
        anomaly.isTrueAnomaly,
        anomaly.confidence.toFixed(3)
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'climate_anomalies_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No anomalies detected yet. Run the detection algorithm first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.total}</div>
            <p className="text-xs text-muted-foreground">
              Out of {data.length} data points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">True Anomalies</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats?.trueCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.truePercentage.toFixed(1)}% of detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Positives</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.falseCount}</div>
            <p className="text-xs text-muted-foreground">
              Filtered out by vector analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{(stats?.avgConfidence * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Detection reliability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">True Positive Rate</Label>
              <Progress value={stats?.truePercentage} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">{stats?.truePercentage.toFixed(1)}%</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Avg Z-Score</Label>
              <Progress value={Math.min((stats?.avgZScore || 0) * 20, 100)} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">{stats?.avgZScore.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Directional Consistency</Label>
              <Progress value={(stats?.avgDirectionalConsistency || 0) * 100} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">{(stats?.avgDirectionalConsistency * 100).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detailed Anomaly Results</CardTitle>
          <Button onClick={exportResults} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {anomalies.slice(0, 20).map((anomaly, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {anomaly.lat}°, {anomaly.lon}°
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {anomaly.month}/{anomaly.date}/{anomaly.year}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Precipitation</p>
                    <p className="text-sm text-muted-foreground">
                      {anomaly.prec.toFixed(2)} mm
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Z-Score</p>
                    <p className="text-sm text-muted-foreground">
                      {anomaly.zScore.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={anomaly.isTrueAnomaly ? "default" : "destructive"}>
                    {anomaly.isTrueAnomaly ? "True" : "False"}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">{(anomaly.confidence * 100).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">confidence</p>
                  </div>
                </div>
              </div>
            ))}
            
            {anomalies.length > 20 && (
              <div className="text-center py-4 text-muted-foreground">
                Showing first 20 of {anomalies.length} anomalies. Export CSV for complete results.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-sm font-medium ${className}`}>{children}</div>
);

export default ResultsDashboard;