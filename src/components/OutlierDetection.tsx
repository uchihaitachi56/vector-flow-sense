import { useState, useMemo } from "react";
import { Play, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ClimateData } from "@/pages/Index";

interface OutlierDetectionProps {
  data: ClimateData[];
  onAnomaliesDetected: (anomalies: any[]) => void;
}

interface DetectionConfig {
  zScoreThreshold: number;
  madThreshold: number;
  spatialRadius: number;
  enableSeasonalDecomposition: boolean;
  enableDirectionalConsistency: boolean;
  minimumNeighbors: number;
}

const OutlierDetection = ({ data, onAnomaliesDetected }: OutlierDetectionProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<DetectionConfig>({
    zScoreThreshold: 2.5,
    madThreshold: 3.0,
    spatialRadius: 0.5,
    enableSeasonalDecomposition: true,
    enableDirectionalConsistency: true,
    minimumNeighbors: 3
  });

  const { toast } = useToast();

  // Statistics for current dataset
  const dataStats = useMemo(() => {
    if (data.length === 0) return null;

    const precStats = {
      mean: data.reduce((sum, d) => sum + d.prec, 0) / data.length,
      std: 0,
      median: 0
    };

    const sortedPrec = [...data].map(d => d.prec).sort((a, b) => a - b);
    precStats.median = sortedPrec[Math.floor(sortedPrec.length / 2)];
    precStats.std = Math.sqrt(
      data.reduce((sum, d) => sum + Math.pow(d.prec - precStats.mean, 2), 0) / data.length
    );

    return { precStats };
  }, [data]);

  // Convert wind speed and direction to vector components
  const convertWindToVector = (ws: number, wd: number) => {
    const radians = (wd * Math.PI) / 180;
    return {
      u: ws * Math.cos(radians),
      v: ws * Math.sin(radians)
    };
  };

  // Calculate Z-score outliers
  const detectMagnitudeOutliers = (data: ClimateData[]) => {
    const mean = data.reduce((sum, d) => sum + d.prec, 0) / data.length;
    const std = Math.sqrt(
      data.reduce((sum, d) => sum + Math.pow(d.prec - mean, 2), 0) / data.length
    );

    return data.map((point, index) => {
      const zScore = Math.abs(point.prec - mean) / std;
      return {
        ...point,
        index,
        zScore,
        isOutlier: zScore > config.zScoreThreshold
      };
    });
  };

  // Find spatial neighbors
  const findNeighbors = (targetPoint: ClimateData, allPoints: ClimateData[]) => {
    return allPoints.filter(point => {
      if (point.lat === targetPoint.lat && point.lon === targetPoint.lon) return false;
      
      const distance = Math.sqrt(
        Math.pow(point.lat - targetPoint.lat, 2) + 
        Math.pow(point.lon - targetPoint.lon, 2)
      );
      
      return distance <= config.spatialRadius;
    });
  };

  // Calculate directional consistency
  const calculateDirectionalConsistency = (
    targetPoint: ClimateData, 
    neighbors: ClimateData[]
  ) => {
    if (neighbors.length < config.minimumNeighbors) {
      return { consistency: 0, isCoherent: false };
    }

    const targetVector = convertWindToVector(targetPoint.ws10m, targetPoint.wd10m);
    
    // Calculate mean neighbor vector
    const meanNeighborVector = neighbors.reduce(
      (acc, neighbor) => {
        const vector = convertWindToVector(neighbor.ws10m, neighbor.wd10m);
        return {
          u: acc.u + vector.u,
          v: acc.v + vector.v
        };
      },
      { u: 0, v: 0 }
    );

    meanNeighborVector.u /= neighbors.length;
    meanNeighborVector.v /= neighbors.length;

    // Calculate cosine similarity
    const targetMagnitude = Math.sqrt(targetVector.u * targetVector.u + targetVector.v * targetVector.v);
    const neighborMagnitude = Math.sqrt(meanNeighborVector.u * meanNeighborVector.u + meanNeighborVector.v * meanNeighborVector.v);
    
    if (targetMagnitude === 0 || neighborMagnitude === 0) {
      return { consistency: 0, isCoherent: false };
    }

    const dotProduct = targetVector.u * meanNeighborVector.u + targetVector.v * meanNeighborVector.v;
    const consistency = dotProduct / (targetMagnitude * neighborMagnitude);

    return {
      consistency,
      isCoherent: consistency > 0.5 // Threshold for directional coherence
    };
  };

  // Main detection algorithm
  const runDetection = async () => {
    if (data.length === 0) {
      toast({
        title: "No data available",
        description: "Please upload data first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Detect magnitude-based outliers
      const magnitudeOutliers = detectMagnitudeOutliers(data);
      const candidateAnomalies = magnitudeOutliers.filter(point => point.isOutlier);

      // Step 2: Apply directional consistency check
      const validatedAnomalies = [];

      for (const candidate of candidateAnomalies) {
        const neighbors = findNeighbors(candidate, data);
        
        if (config.enableDirectionalConsistency) {
          const { consistency, isCoherent } = calculateDirectionalConsistency(candidate, neighbors);
          
          validatedAnomalies.push({
            ...candidate,
            neighbors: neighbors.length,
            directionalConsistency: consistency,
            isDirectionallyCoherent: isCoherent,
            isTrueAnomaly: isCoherent,
            confidence: isCoherent ? 0.8 + (consistency * 0.2) : 0.3 - (consistency * 0.2)
          });
        } else {
          validatedAnomalies.push({
            ...candidate,
            neighbors: neighbors.length,
            directionalConsistency: null,
            isDirectionallyCoherent: null,
            isTrueAnomaly: true, // Without directional check, assume all are true
            confidence: 0.7
          });
        }
      }

      // Step 3: Sort by confidence
      const sortedAnomalies = validatedAnomalies.sort((a, b) => b.confidence - a.confidence);

      onAnomaliesDetected(sortedAnomalies);

      toast({
        title: "Detection completed",
        description: `Found ${sortedAnomalies.length} anomalies (${sortedAnomalies.filter(a => a.isTrueAnomaly).length} marked as true)`,
      });

    } catch (error) {
      toast({
        title: "Detection failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No data available for outlier detection. Please upload data first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Detection Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Z-Score Threshold: {config.zScoreThreshold}</Label>
                <Slider
                  value={[config.zScoreThreshold]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, zScoreThreshold: value }))}
                  min={1.5}
                  max={4.0}
                  step={0.1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Spatial Radius (degrees): {config.spatialRadius}</Label>
                <Slider
                  value={[config.spatialRadius]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, spatialRadius: value }))}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Minimum Neighbors: {config.minimumNeighbors}</Label>
                <Slider
                  value={[config.minimumNeighbors]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, minimumNeighbors: value }))}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Seasonal Decomposition</Label>
                <Switch
                  checked={config.enableSeasonalDecomposition}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableSeasonalDecomposition: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Directional Consistency</Label>
                <Switch
                  checked={config.enableDirectionalConsistency}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableDirectionalConsistency: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Statistics */}
      {dataStats && (
        <Card>
          <CardHeader>
            <CardTitle>Dataset Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Mean Precipitation</p>
                <p className="text-xl font-bold text-primary">{dataStats.precStats.mean.toFixed(2)} mm</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Std Deviation</p>
                <p className="text-xl font-bold text-accent">{dataStats.precStats.std.toFixed(2)} mm</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Median</p>
                <p className="text-xl font-bold text-success">{dataStats.precStats.median.toFixed(2)} mm</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Detection */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            {isProcessing ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground">Running vector-aware outlier detection...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-success mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Detect Anomalies</h3>
                  <p className="text-muted-foreground mb-4">
                    Algorithm will detect outliers using magnitude-based screening followed by 
                    directional consistency validation using wind vector analysis.
                  </p>
                  <Button onClick={runDetection} size="lg" className="min-w-[200px]">
                    <Play className="h-4 w-4 mr-2" />
                    Run Detection
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutlierDetection;