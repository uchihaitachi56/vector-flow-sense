import { useState, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClimateData } from "@/pages/Index";

interface DataUploadProps {
  onDataUploaded: (data: ClimateData[]) => void;
}

const DataUpload = ({ onDataUploaded }: DataUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [processingProgress, setProcessingProgress] = useState<string>("");
  const { toast } = useToast();

  const parseCSVData = async (csvText: string, setProgress?: (progress: string) => void): Promise<ClimateData[]> => {
    console.log('Starting CSV parse, text length:', csvText.length);
    const lines = csvText.trim().split('\n');
    console.log('Total lines to process:', lines.length);
    
    if (lines.length > 50000) {
      console.warn('Large dataset detected:', lines.length, 'lines');
    }
    
    const headers = lines[0].split(/[,\t]/);
    console.log('Headers found:', headers);
    
    // Validate headers
    const expectedHeaders = ['Lat', 'Lon', 'Year', 'Month', 'Date', 'WS10M', 'WD10M', 'QV2M', 'Prec'];
    const hasValidHeaders = expectedHeaders.every(header => 
      headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
    );
    
    if (!hasValidHeaders) {
      throw new Error(`Invalid CSV format. Expected headers: ${expectedHeaders.join(', ')}`);
    }

    const data: ClimateData[] = [];
    const chunkSize = 1000; // Process 1000 rows at a time
    
    // Process in chunks to avoid blocking the UI
    for (let startIndex = 1; startIndex < lines.length; startIndex += chunkSize) {
      const endIndex = Math.min(startIndex + chunkSize, lines.length);
      const progress = Math.round((startIndex / lines.length) * 100);
      console.log(`Processing chunk ${startIndex} to ${endIndex} (${progress}%)`);
      
      // Update progress for large datasets
      if (lines.length > 5000 && setProgress) {
        setProgress(`Processing data... ${progress}% complete`);
      }
      
      // Process chunk
      for (let i = startIndex; i < endIndex; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(/[,\t]/);
        if (values.length >= 9) {
          const parsedRow = {
            lat: parseFloat(values[0]),
            lon: parseFloat(values[1]),
            year: parseInt(values[2]),
            month: parseInt(values[3]),
            date: parseInt(values[4]),
            ws10m: parseFloat(values[5]),
            wd10m: parseFloat(values[6]),
            qv2m: parseFloat(values[7]),
            prec: parseFloat(values[8])
          };
          
          // Validate the parsed data
          if (!isNaN(parsedRow.lat) && !isNaN(parsedRow.lon) && 
              !isNaN(parsedRow.year) && !isNaN(parsedRow.prec)) {
            data.push(parsedRow);
          }
        }
      }
      
      // Yield control back to browser every chunk
      if (startIndex + chunkSize < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    console.log('Parsing complete. Valid rows:', data.length);
    return data;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    console.log('Starting file upload, size:', file.size, 'bytes');
    setIsProcessing(true);
    setUploadStatus("idle");
    setProcessingProgress(""); // Clear any previous progress

    try {
      // Check file size (warn if over 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.warn('Large file detected:', file.size, 'bytes');
        toast({
          title: "Large file detected",
          description: "This may take a while to process...",
        });
      }

      const text = await file.text();
      console.log('File read complete, starting parse...');
      
      const data = await parseCSVData(text, setProcessingProgress);
      
      if (data.length === 0) {
        throw new Error("No valid data rows found in the file");
      }

      console.log('Upload successful, data points:', data.length);
      setUploadStatus("success");
      onDataUploaded(data);
      
      toast({
        title: "Data uploaded successfully",
        description: `Processed ${data.length} data points`,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus("error");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(""); // Clear progress when done
    }
  }, [onDataUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileUpload(csvFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  }, [handleFileUpload, toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card 
        className={`border-2 border-dashed transition-all duration-200 ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : uploadStatus === 'success' 
            ? 'border-success bg-success/5'
            : uploadStatus === 'error'
            ? 'border-destructive bg-destructive/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">
                {processingProgress || "Processing your data..."}
              </p>
              {processingProgress && (
                <p className="text-xs text-muted-foreground mt-2">
                  Large dataset detected - please wait
                </p>
              )}
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <CheckCircle className="h-12 w-12 text-success mb-4" />
              <p className="text-success font-medium">Data uploaded successfully!</p>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium">Upload failed. Please try again.</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Climate Data</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
            </>
          )}
          
          {!isProcessing && uploadStatus !== 'success' && (
            <div className="space-y-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">Expected CSV Format:</h4>
          <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
            <div>Lat,Lon,Year,Month,Date,WS10M,WD10M,QV2M,Prec</div>
            <div>29,79,1981,1,5,2.88,107.31,6.65,0.29</div>
            <div>29,79,1981,1,6,2.03,197.62,6.47,6.21</div>
            <div>...</div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            • Lat/Lon: Geographic coordinates<br/>
            • WS10M: Wind speed at 10m<br/>
            • WD10M: Wind direction at 10m<br/>
            • QV2M: Specific humidity at 2m<br/>
            • Prec: Precipitation
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataUpload;