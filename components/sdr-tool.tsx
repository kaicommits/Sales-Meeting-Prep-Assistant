"use client"

import { useState, useEffect } from 'react'
import { Upload, X, Zap, Copy, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

type FormData = {
  meetingReason: string
  accountType: 'Pro' | 'Hobby' | 'New Customer' | ''
  proTeamUsage: string
  companyWebsite: string
  recentFunding: string
}

type ScreenshotData = {
  [key: string]: File[]
}

export default function SDRTool() {
  const [formData, setFormData] = useState<FormData>({
    meetingReason: '',
    accountType: '',
    proTeamUsage: '',
    companyWebsite: '',
    recentFunding: '',
  })

  const [screenshots, setScreenshots] = useState<ScreenshotData>({
    meetingReason: [],
    proBill: [],
    techStack: [],
    prospectInfo: []
  })

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => {
        clearInterval(interval);
        setLoadingProgress(0);
      };
    }
  }, [isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAccountTypeChange = (value: 'Pro' | 'Hobby' | 'New Customer') => {
    setFormData(prev => ({ ...prev, accountType: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files) {
      setScreenshots(prev => ({
        ...prev,
        [name]: [...prev[name], ...Array.from(files)]
      }))
    }
  }

  const handleFileRemove = (name: string, index: number) => {
    setScreenshots(prev => ({
      ...prev,
      [name]: prev[name].filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formDataToSend = new FormData();
    formDataToSend.append('meetingReason', formData.meetingReason);
    
    // Append email screenshots
    screenshots.meetingReason.forEach((file) => {
      formDataToSend.append('meetingReason', file);
    });

    formDataToSend.append('accountType', formData.accountType);
    formDataToSend.append('proTeamUsage', formData.proTeamUsage);
    formDataToSend.append('companyWebsite', formData.companyWebsite);
    formDataToSend.append('recentFunding', formData.recentFunding);

    // Append files
    screenshots.proBill.forEach((file) => {
      formDataToSend.append('proBill', file);
    });
    screenshots.techStack.forEach((file) => {
      formDataToSend.append('techStack', file);
    });
    screenshots.prospectInfo.forEach((file) => {
      formDataToSend.append('prospectInfo', file);
    });

    try {
      const response = await fetch('/api/generate-notion-doc', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.notionDoc);
    } catch (error: unknown) {
      console.error('Error generating document:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred while generating the document'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = () => {
    if (result) {
      navigator.clipboard.writeText(result)
        .then(() => alert('Text copied to clipboard!'))
        .catch(err => console.error('Failed to copy text: ', err))
    }
  }

  const handleNewDocument = () => {
    setFormData({
      meetingReason: '',
      accountType: '',
      proTeamUsage: '',
      companyWebsite: '',
      recentFunding: '',
    })
    setScreenshots({
      meetingReason: [],
      proBill: [],
      techStack: [],
      prospectInfo: []
    })
    setResult(null)
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>🧑‍💻 Vercel Sales Meeting Prep Assistant</CardTitle>
          <CardDescription>Enter information and upload screenshots to create a meeting prep document</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-4">
              <Label htmlFor="meetingReason" className="text-lg font-semibold">🤝 Meeting Context</Label>
              <div className="flex flex-col space-y-2">
                <Input
                  id="meetingReason"
                  name="meetingReason"
                  value={formData.meetingReason}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="Enter the reason for the meeting (optional)"
                />
                <div>
                  <Input
                    type="file"
                    id="meetingReason-screenshot"
                    name="meetingReason"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    multiple
                  />
                  <Label
                    htmlFor="meetingReason-screenshot"
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-black hover:text-white h-10 px-4 py-2"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Screenshots of the Email or LinkedIn Exchange
                  </Label>
                  {screenshots.meetingReason.map((file, index) => (
                    <div key={index} className="mt-2 flex items-center">
                      <span className="text-sm text-gray-500">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleFileRemove('meetingReason', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">🏷️ Account Type</Label>
              <RadioGroup onValueChange={handleAccountTypeChange} value={formData.accountType} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pro" id="pro" />
                  <Label htmlFor="pro">Pro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Hobby" id="hobby" />
                  <Label htmlFor="hobby">Hobby</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="New Customer" id="new-customer" />
                  <Label htmlFor="new-customer">New Customer</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label htmlFor="proTeamUsage" className="text-lg font-semibold">👥 Pro Team Usage</Label>
              <Input
                id="proTeamUsage"
                name="proTeamUsage"
                value={formData.proTeamUsage}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Enter what the customer is currently using the Pro Team or Hobby Account for (ex. internal tools, marketing site, web app, etc.)"
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="proBill-screenshot" className="text-lg font-semibold">💰 Pro Bill</Label>
              <div>
                <Input
                  type="file"
                  id="proBill-screenshot"
                  name="proBill"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  multiple
                />
                <Label
                  htmlFor="proBill-screenshot"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-black hover:text-white h-10 px-4 py-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload screenshots of the bill over the last 6 months and last month's invoice details
                </Label>
                {screenshots.proBill.map((file, index) => (
                  <div key={index} className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => handleFileRemove('proBill', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label htmlFor="techStack-screenshot" className="text-lg font-semibold">🖥️ Tech Stack</Label>
              <div>
                <Input
                  type="file"
                  id="techStack-screenshot"
                  name="techStack"
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                  multiple
                />
                <Label
                  htmlFor="techStack-screenshot"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-black hover:text-white h-10 px-4 py-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload .csv files of Wappalyzer export
                </Label>
                {screenshots.techStack.map((file, index) => (
                  <div key={index} className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => handleFileRemove('techStack', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label htmlFor="companyWebsite" className="text-lg font-semibold">🏢 Company Description</Label>
              <Input
                id="companyWebsite"
                name="companyWebsite"
                value={formData.companyWebsite}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Paste link of company's website"
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="recentFunding" className="text-lg font-semibold">💸 Recent Funding</Label>
              <Input
                id="recentFunding"
                name="recentFunding"
                value={formData.recentFunding}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Paste any links to articles announcing funding rounds for this prospect"
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="prospectInfo-screenshot" className="text-lg font-semibold">👤 Prospect Info</Label>
              <div>
                <Input
                  type="file"
                  id="prospectInfo-screenshot"
                  name="prospectInfo"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  multiple
                />
                <Label
                  htmlFor="prospectInfo-screenshot"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-black hover:text-white h-10 px-4 py-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Screenshots of the Prospect's LinkedIn Profile and Experience
                </Label>
                {screenshots.prospectInfo.map((file, index) => (
                  <div key={index} className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => handleFileRemove('prospectInfo', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative w-full">
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-r-transparent" />
                    Generating Document...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Meeting Prep Document
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="mt-8">
          {result && (
            <div className="w-full pt-4">
              <h3 className="text-lg font-semibold mb-2">Generated Document Preview:</h3>
              <Textarea
                value={result}
                readOnly
                className="w-full h-96 mb-4 font-mono text-sm"
              />
              <div className="flex justify-end space-x-2">
                <Button onClick={handleCopyText} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Copy className="mr-1 h-4 w-4" />
                  Copy Text
                </Button>
                <Button onClick={handleNewDocument} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <RefreshCw className="mr-1 h-4 w-4" />
                  New Document
                </Button>
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-500 mt-2">
              {error}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}







