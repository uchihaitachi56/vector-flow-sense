import { useState } from "react";
import { Upload, BarChart3, Wind, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataUpload from "@/components/DataUpload";
import DataVisualization from "@/components/DataVisualization";
import OutlierDetection from "@/components/OutlierDetection";
import ResultsDashboard from "@/components/ResultsDashboard";
import heroImage from "@/assets/climate-hero.jpg";

export interface ClimateData {
  lat: number;
  lon: number;
  year: number;
  month: number;
  date: number;
  ws10m: number;
  wd10m: number;
  qv2m: number;
  prec: number;
}

const Index = () => {
  const [data, setData] = useState<ClimateData[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("upload");

  const handleDataUpload = (uploadedData: ClimateData[]) => {
    console.log('Data uploaded:', uploadedData.length, 'records');
    setData(uploadedData);
    setActiveTab("visualize");
  };

  const handleAnomaliesDetected = (detectedAnomalies: any[]) => {
    setAnomalies(detectedAnomalies);
    setActiveTab("results");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/80" />
        <div className="relative z-10 flex h-full items-center justify-center text-center">
          <div className="max-w-4xl px-6">
            <h1 className="mb-4 text-5xl font-bold text-white">
              Vector-Aware Climate Outlier Detection
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Advanced anomaly detection for climate data using directional consistency analysis 
              and spatial autocorrelation to distinguish real weather events from noise.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Data Upload
            </TabsTrigger>
            <TabsTrigger value="visualize" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Visualization
            </TabsTrigger>
            <TabsTrigger value="detect" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Outlier Detection
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Climate Data</CardTitle>
                <CardDescription>
                  Upload your CSV file with Lat, Lon, Year, Month, Date, WS10M, WD10M, QV2M, Prec columns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataUpload onDataUploaded={handleDataUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualize" className="mt-6">
            <DataVisualization data={data} />
          </TabsContent>

          <TabsContent value="detect" className="mt-6">
            <OutlierDetection data={data} onAnomaliesDetected={handleAnomaliesDetected} />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <ResultsDashboard anomalies={anomalies} data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;