"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Shield, ThumbsDown, ThumbsUp } from "lucide-react"
import { captureLinks } from "./api-integration"
import { processLinks, refineThreatAssessment } from "./real-time-link-scanning"

export function UserControlInterface() {
  const [scanResults, setScanResults] = useState<
    {
      url: string
      score: number
      details: string
      timestamp: Date
    }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, "positive" | "negative">>({})

  // Step 3: Display results to the user
  const displayResults = (results: { url: string; score: number; details: string }) => {
    setScanResults((prev) => [{ ...results, timestamp: new Date() }, ...prev])
    setLoading(false)
  }

  // Step 4: User makes a decision on the threat assessment
  const userDecision = async (url: string, decision: "positive" | "negative") => {
    setFeedback((prev) => ({
      ...prev,
      [url]: decision,
    }))

    // Step 5: Feed user actions back into the system
    await feedbackUserActions(url, decision)
  }

  // Step 5: Send feedback to improve the system
  const feedbackUserActions = async (url: string, decision: "positive" | "negative") => {
    try {
      await refineThreatAssessment(url, decision)
    } catch (error) {
      console.error("Error sending feedback:", error)
    }
  }

  // Initiate the scanning process
  const scanFacebookLinks = async () => {
    setLoading(true)
    try {
      // Step 1: Capture links from Facebook
      const links = await captureLinks()

      // Step 2: Process links and get threat assessment
      for (const link of links) {
        const result = await processLinks(link)
        displayResults({
          url: link,
          score: result.threatAssessmentScore,
          details: result.details,
        })
      }
    } catch (error) {
      console.error("Error scanning links:", error)
      setLoading(false)
    }
  }

  const getThreatLevel = (score: number) => {
    if (score < 30) return { level: "Low", color: "bg-green-100 text-green-800" }
    if (score < 70) return { level: "Medium", color: "bg-yellow-100 text-yellow-800" }
    return { level: "High", color: "bg-red-100 text-red-800" }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Link Scanner Dashboard</CardTitle>
        <CardDescription>Scan links from Facebook in real-time and assess potential threats</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="scan">
          <TabsList className="mb-4">
            <TabsTrigger value="scan">Scan</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Facebook Integration</AlertTitle>
                <AlertDescription>
                  Click the button below to scan links from your Facebook feed for potential threats.
                </AlertDescription>
              </Alert>

              <Button onClick={scanFacebookLinks} disabled={loading} className="w-full">
                {loading ? "Scanning..." : "Scan Facebook Links"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results">
            {scanResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scan results yet. Start a scan to see results here.
              </div>
            ) : (
              <div className="space-y-4">
                {scanResults.map((result, index) => {
                  const threat = getThreatLevel(result.score)
                  return (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="truncate flex-1 mr-2">
                            <CardTitle className="text-sm font-medium">{result.url}</CardTitle>
                            <CardDescription className="text-xs">{result.timestamp.toLocaleString()}</CardDescription>
                          </div>
                          <Badge className={threat.color}>
                            {threat.level} Risk ({result.score}%)
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2 text-sm">
                        <p>{result.details}</p>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-end gap-2">
                        <Button
                          variant={feedback[result.url] === "positive" ? "default" : "outline"}
                          size="sm"
                          onClick={() => userDecision(result.url, "positive")}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Accurate
                        </Button>
                        <Button
                          variant={feedback[result.url] === "negative" ? "default" : "outline"}
                          size="sm"
                          onClick={() => userDecision(result.url, "negative")}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Inaccurate
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

