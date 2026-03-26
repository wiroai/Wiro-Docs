# Files

Manage folders and upload files for use with AI models.

## Overview

The Files API lets you organize and upload data that can be referenced in model runs. Common use cases include:

- **Training data** — upload datasets for fine-tuning models
- **File inputs** — provide images, audio, or documents as model inputs
- **Batch processing** — store files for repeated use across multiple runs

## **POST** /File/FolderCreate

Creates a new folder to organize your uploaded files.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Folder name (letters, numbers, hyphens, underscores only) |
| `parentid` | string | No | Parent folder ID for nested structure (omit for root) |

### Response

```json
{
  "result": true,
  "errors": [],
  "list": [{
    "id": "folder-abc123",
    "name": "training-data",
    "parentid": "root-folder-id",
    "size": "0",
    "contenttype": "",
    "addedtime": "1716276543"
  }]
}
```

## **POST** /File/Upload

Uploads a file using `multipart/form-data`. You can optionally assign it to a folder.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | The file to upload (multipart form field) |
| `folderid` | string | No | Target folder ID (uploads to user's default folder if omitted) |

**File size limit:** 100 MB per file.

**Supported file types:** Images (jpg, png, gif, jpeg, webp, heic), video (mp4, webm, mov), audio (mp3, wav, m4a), documents (pdf, csv, docx, xlsx, pptx, txt, md, epub), and ZIP archives (automatically extracted).

### Response

```json
{
  "result": true,
  "errors": [],
  "list": [{
    "id": "file-id",
    "name": "dataset.csv",
    "contenttype": "text/csv",
    "size": "1048576",
    "parentid": "folder-id",
    "url": "https://cdn1.wiro.ai/...",
    "addedtime": "1716276727",
    "accesskey": "..."
  }]
}
```

## Using Files in Runs

Once uploaded, reference a file by its URL in your model run parameters. For example, an image upscaler model might accept an `inputImageUrl` parameter — pass the URL returned from the upload response.

You don't always need to upload files first. Most models accept direct URLs in their file parameters — you can pass any publicly accessible URL. See [Model Parameters](/docs/model-parameters) for details on `fileinput`, `multifileinput`, and `combinefileinput` patterns.

```json
{
  "inputImageUrl": "https://cdn1.wiro.ai/...",
  "scale": 4
}
```

## Code Examples

### curl (Folder)

```bash
curl -X POST "https://api.wiro.ai/v1/File/FolderCreate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "training-data"
  }'
```

### curl (Upload)

```bash
curl -X POST "https://api.wiro.ai/v1/File/Upload" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/path/to/dataset.csv" \
  -F "folderid=folder-id-here"
```

### Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# Create a folder
folder_resp = requests.post(
    "https://api.wiro.ai/v1/File/FolderCreate",
    headers=headers,
    json={
        "name": "training-data"
    }
)
folder_id = folder_resp.json()["list"][0]["id"]
print(f"Folder ID: {folder_id}")

# Upload a file
with open("dataset.csv", "rb") as f:
    upload_resp = requests.post(
        "https://api.wiro.ai/v1/File/Upload",
        headers={"x-api-key": "YOUR_API_KEY"},
        files={"file": f},
        data={"folderid": folder_id}
    )
file_url = upload_resp.json()["list"][0]["url"]
print(f"File URL: {file_url}")
```

### Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

// Create a folder
const folderResp = await axios.post(
  'https://api.wiro.ai/v1/File/FolderCreate',
  { name: 'training-data' },
  { headers }
);
const folderId = folderResp.data.list[0].id;
console.log('Folder ID:', folderId);

// Upload a file
const form = new FormData();
form.append('file', fs.createReadStream('dataset.csv'));
form.append('folderid', folderId);

const uploadResp = await axios.post(
  'https://api.wiro.ai/v1/File/Upload',
  form,
  { headers: { 'x-api-key': 'YOUR_API_KEY', ...form.getHeaders() } }
);
const fileUrl = uploadResp.data.list[0].url;
console.log('File URL:', fileUrl);
```

### PHP

```php
<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/File/FolderCreate");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "name" => "training-data"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

var content = new StringContent(
    JsonSerializer.Serialize(new {
        name = "training-data"
    }),
    Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://api.wiro.ai/v1/File/FolderCreate", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "io"
)

func main() {
    body, _ := json.Marshal(map[string]interface{}{
        "name": "training-data",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/File/FolderCreate",
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
```

### Swift

```swift
import Foundation

let url = URL(string: "https://api.wiro.ai/v1/File/FolderCreate")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "name": "training-data"
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/File/FolderCreate")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{
    "name": "training-data"
}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/File/FolderCreate'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'name': 'training-data',
  }),
);
print(response.body);
```
