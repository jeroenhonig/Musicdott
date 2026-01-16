/**
 * Video Capture Component for Practice Videos
 * Integrates with teacher chat for video feedback
 */

import { useState, useRef, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, Square, RotateCcw, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoCaptureProps {
  onVideoUploaded?: (videoId: string) => void;
  maxDuration?: number; // in seconds
  assignmentId?: string;
}

export function VideoCapture({ 
  onVideoUploaded, 
  maxDuration = 300, // 5 minutes default
  assignmentId 
}: VideoCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    setRecordingTime(0);

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm; codecs=vp9,opus'
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    mediaRecorder.start(100); // Collect data every 100ms
    setIsRecording(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        if (newTime >= maxDuration) {
          stopRecording();
        }
        return newTime;
      });
    }, 1000);
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setRecordingTime(0);
    recordedChunksRef.current = [];
  }, [recordedVideoUrl]);

  const uploadVideo = useCallback(async () => {
    if (!recordedVideoUrl) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert blob URL to blob
      const response = await fetch(recordedVideoUrl);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('video', blob, `practice-video-${Date.now()}.webm`);
      if (assignmentId) {
        formData.append('assignmentId', assignmentId);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload to server
      const uploadResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        
        toast({
          title: "Video Uploaded",
          description: "Your practice video has been uploaded successfully!",
        });

        // Award points for video submission
        await fetch('/api/gamification/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ruleKey: 'video.submitted',
            idempotencyKey: `video_${result.videoId}_${Date.now()}`,
            proofAssetId: result.videoId
          })
        });

        onVideoUploaded?.(result.videoId);
        resetRecording();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not upload video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [recordedVideoUrl, assignmentId, toast, onVideoUploaded, resetRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / maxDuration) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Practice Video Recorder
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Display */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {!recordedVideoUrl ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={recordedVideoUrl}
              controls
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              REC
            </div>
          )}
        </div>

        {/* Timer and Progress */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-mono font-bold text-red-600">
                {formatTime(recordingTime)}
              </span>
              <span className="text-sm text-gray-500">
                Max: {formatTime(maxDuration)}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Uploading video...</span>
              <span className="text-sm">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!recordedVideoUrl ? (
            <>
              {!streamRef.current && (
                <Button onClick={startCamera} className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Start Camera
                </Button>
              )}
              
              {streamRef.current && !isRecording && (
                <Button 
                  onClick={startRecording}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Video className="h-4 w-4" />
                  Start Recording
                </Button>
              )}
              
              {isRecording && (
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={resetRecording}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Record Again
              </Button>
              
              <Button 
                onClick={uploadVideo}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </>
          )}
        </div>

        {recordedVideoUrl && !isUploading && (
          <div className="text-center text-sm text-green-600">
            Video recorded successfully! Duration: {formatTime(recordingTime)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}