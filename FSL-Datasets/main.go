/*
 * main.go - Unified media server and authentication proxy for FSL Datasets
 * Copyright 2026 Karl Benjamin R. Bughaw
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func proxy(target string, prefix string) gin.HandlerFunc {
	remote, _ := url.Parse(target)
	proxy := httputil.NewSingleHostReverseProxy(remote)
	
	proxy.Director = func(req *http.Request) {
		req.Header.Add("X-Forwarded-Host", req.Host)
		req.Header.Add("X-Origin-Host", remote.Host)
		req.URL.Scheme = remote.Scheme
		req.URL.Host = remote.Host
		
		// Strip prefix
		path := req.URL.Path
		if prefix != "" {
			path = strings.TrimPrefix(path, prefix)
		}
		req.URL.Path = path
		
		// If the target has a path (like /base), prepend it
		if remote.Path != "" {
			req.URL.Path = filepath.Join(remote.Path, req.URL.Path)
		}
	}

	return func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

var videoLookup = make(map[string]string)

const (
	dataDir     = "videos"
	metadataDir = "metadata"
	staticDir   = "dist"
)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "+", "-")
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.ReplaceAll(s, "(", "")
	s = strings.ReplaceAll(s, ")", "")
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	return s
}

func init() {
	files, err := os.ReadDir(dataDir)
	if err != nil {
		return
	}
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(strings.ToLower(file.Name()), ".mp4") {
			name := file.Name()
			lowerName := strings.ToLower(name)
			
			// 1. Direct lowercase match (highest priority)
			videoLookup[lowerName] = name
			
			// 2. Full slugified match (e.g., "i-love-you-variant-a.mp4")
			fullSlug := slugify(name)
			if _, exists := videoLookup[fullSlug]; !exists {
				videoLookup[fullSlug] = name
			}

			// 3. Root slugified match (e.g., "i-love-you.mp4" from "I love you (Variant A).mp4")
			// This allows the base word to work even if it has (Variant A) etc.
			base := strings.TrimSuffix(lowerName, ".mp4")
			// Remove common suffixes like " (variant a)", " variant b", etc.
			base = strings.Split(base, "(")[0]
			base = strings.Split(base, "variant")[0]
			
			rootSlug := slugify(strings.TrimSpace(base)) + ".mp4"
			if _, exists := videoLookup[rootSlug]; !exists {
				videoLookup[rootSlug] = name
			}
		}
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(gin.Recovery())

	// Simple CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
		c.Next()
	})

	// 1. Metadata Route
	r.GET("/api.json", func(c *gin.Context) {
		c.File(filepath.Join(metadataDir, "api.json"))
	})

	// 2. Static Assets Route
	r.Static("/assets", filepath.Join(staticDir, "assets"))
	r.Static("/videos", dataDir)

	// Proxy routes for VM API (Translator) - Strip prefix
	r.Any("/vm-api/*proxyPath", proxy("http://134.185.92.120:8000", "/vm-api"))
	
	// Proxy routes for Local API (Auth/DB) - Do NOT strip prefix (Node server expects /api/...)
	r.Any("/api/*proxyPath", proxy("http://localhost:3001", ""))

	// 3. Catch-all for Videos and Frontend
	r.NoRoute(func(c *gin.Context) {
		path := strings.TrimPrefix(c.Request.URL.Path, "/")
		if path == "" {
			c.File(filepath.Join(staticDir, "index.html"))
			return
		}

		lowerPath := strings.ToLower(path)
		
		// Helper to try and serve a video
		tryServeVideo := func(p string) bool {
			// 1. Direct match
			if actualName, exists := videoLookup[strings.ToLower(p)]; exists {
				c.File(filepath.Join(dataDir, actualName))
				return true
			}
			// 2. Slugified match
			if actualName, exists := videoLookup[slugify(p)]; exists {
				c.File(filepath.Join(dataDir, actualName))
				return true
			}
			return false
		}

		// Try original path
		if tryServeVideo(path) {
			return
		}

		// If it doesn't have .mp4, try adding it
		if !strings.HasSuffix(lowerPath, ".mp4") {
			if tryServeVideo(path + ".mp4") {
				return
			}
		}

		// Try to serve static files (favicon, etc.)
		filePath := filepath.Join(staticDir, path)
		if fileInfo, err := os.Stat(filePath); err == nil && !fileInfo.IsDir() {
			c.File(filePath)
			return
		}

		// If we are on the API port (8080), don't serve the frontend on error
		if os.Getenv("PORT") == "8080" {
			c.JSON(404, gin.H{"error": "Video or file not found", "path": path})
			return
		}

		// Default to Frontend (SPA Routing)
		c.File(filepath.Join(staticDir, "index.html"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🚀 Unified Server starting on :%s\n", port)
	r.Run(":" + port)
}
