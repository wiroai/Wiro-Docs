# Authentication

Secure your API requests with signature-based or simple key authentication.

## Overview

Wiro supports two authentication methods. You choose the method when [creating a project](https://wiro.ai/panel/project/new) — it cannot be changed afterward.

**Available methods:** Signature-Based (Recommended) | API Key Only (Simple)

## Signature-Based Authentication

Uses HMAC-SHA256 to sign every request. The API secret never leaves your environment, making this method ideal for **client-side applications** where the key might be exposed.

### How it works

1. Generate a **nonce** (unix timestamp or random integer)
2. Concatenate: `API_SECRET + NONCE`
3. Create an HMAC-SHA256 hash using your `API_KEY` as the secret key
4. Send the signature, nonce, and API key as headers

```
SIGNATURE = HMAC-SHA256(key=API_KEY, message=API_SECRET + NONCE)
```

#### Required Headers

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `x-api-key` | string | Yes | Your project API key |
| `x-signature` | string | Yes | HMAC-SHA256(API_SECRET + NONCE, API_KEY) |
| `x-nonce` | string | Yes | Unix timestamp or random integer |

## API Key Only Authentication

For server-side applications where you control the environment, you can use the simpler API-key-only method. Just include the `x-api-key` header — no signature required.

#### Required Headers

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `x-api-key` | string | Yes | Your project API key |

## Comparison

| Feature | Signature-Based | API Key Only |
|---------|----------------|--------------|
| Security | High — secret never sent over the wire | Moderate — key sent in every request |
| Complexity | Requires HMAC computation | Single header |
| Best for | Client-side apps, mobile, public repos | Server-side, internal tools |
| Replay protection | Yes (via nonce) | No |

## How to Choose

- Building a **client-side** or **mobile** app? Use **Signature-Based**.
- Running a **server-side** backend with controlled access? **API Key Only** is simpler.
- Unsure? Default to **Signature-Based** — it's always the safer option.

## Code Examples

### Signature-Based

#### curl

```bash
export YOUR_API_KEY="your-api-key"
export YOUR_API_SECRET="your-api-secret"
export NONCE=$(date +%s)
export SIGNATURE=$(echo -n "${YOUR_API_SECRET}${NONCE}" | \
  openssl dgst -sha256 -hmac "${YOUR_API_KEY}")

curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${YOUR_API_KEY}" \
  -H "x-nonce: ${NONCE}" \
  -H "x-signature: ${SIGNATURE}" \
  -d '{"prompt": "Hello, world!"}'
```

#### Python

```python
import hmac, hashlib, time, requests

YOUR_API_KEY = "your-api-key"
YOUR_API_SECRET = "your-api-secret"

nonce = str(int(time.time()))
message = YOUR_API_SECRET + nonce
signature = hmac.new(
    YOUR_API_KEY.encode(),
    message.encode(),
    hashlib.sha256
).hexdigest()

response = requests.post(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
    headers={
        "x-api-key": YOUR_API_KEY,
        "x-nonce": nonce,
        "x-signature": signature,
        "Content-Type": "application/json"
    },
    json={"prompt": "Hello, world!"}
)
print(response.json())
```

#### Node.js

```javascript
const crypto = require("crypto");
const axios = require("axios");

const YOUR_API_KEY = "your-api-key";
const YOUR_API_SECRET = "your-api-secret";

const nonce = String(Date.now());
const signature = crypto
  .createHmac("sha256", YOUR_API_KEY)
  .update(YOUR_API_SECRET + nonce)
  .digest("hex");

const response = await axios.post(
  "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
  { prompt: "Hello, world!" },
  {
    headers: {
      "x-api-key": YOUR_API_KEY,
      "x-nonce": nonce,
      "x-signature": signature,
      "Content-Type": "application/json"
    }
  }
);
console.log(response.data);
```

#### PHP

```php
<?php
$apiKey = "your-api-key";
$apiSecret = "your-api-secret";

$nonce = (string)time();
$message = $apiSecret . $nonce;
$signature = hash_hmac("sha256", $message, $apiKey);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: $apiKey",
    "x-nonce: $nonce",
    "x-signature: $signature"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS,
    json_encode(["prompt" => "Hello, world!"]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

#### C#

```csharp
using System.Security.Cryptography;
using System.Text;

var apiKey = "your-api-key";
var apiSecret = "your-api-secret";

var nonce = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
var message = apiSecret + nonce;
using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiKey));
var signature = Convert.ToHexString(
    hmac.ComputeHash(Encoding.UTF8.GetBytes(message))).ToLower();

using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", apiKey);
client.DefaultRequestHeaders.Add("x-nonce", nonce);
client.DefaultRequestHeaders.Add("x-signature", signature);

var content = new StringContent(
    "{\"prompt\":\"Hello, world!\"}",
    Encoding.UTF8, "application/json");
var response = await client.PostAsync(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

#### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "net/http"
    "strconv"
    "strings"
    "time"
    "io"
)

func main() {
    apiKey := "your-api-key"
    apiSecret := "your-api-secret"

    nonce := strconv.FormatInt(time.Now().Unix(), 10)
    mac := hmac.New(sha256.New, []byte(apiKey))
    mac.Write([]byte(apiSecret + nonce))
    signature := hex.EncodeToString(mac.Sum(nil))

    body := strings.NewReader(`{"prompt":"Hello, world!"}`)
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}", body)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", apiKey)
    req.Header.Set("x-nonce", nonce)
    req.Header.Set("x-signature", signature)

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
```

#### Swift

```swift
import Foundation
import CommonCrypto

let apiKey = "your-api-key"
let apiSecret = "your-api-secret"

let nonce = String(Int(Date().timeIntervalSince1970))
let message = (apiSecret + nonce).data(using: .utf8)!
let key = apiKey.data(using: .utf8)!
var hmac = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
message.withUnsafeBytes { msgPtr in
    key.withUnsafeBytes { keyPtr in
        CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA256),
               keyPtr.baseAddress, key.count,
               msgPtr.baseAddress, message.count, &hmac)
    }
}
let signature = hmac.map { String(format: "%02x", $0) }.joined()

var request = URLRequest(url: URL(string:
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
request.setValue(nonce, forHTTPHeaderField: "x-nonce")
request.setValue(signature, forHTTPHeaderField: "x-signature")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: ["prompt": "Hello, world!"])

let (data, _) = try await URLSession.shared.data(for: request)
print(String(data: data, encoding: .utf8)!)
```

#### Kotlin

```kotlin
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.net.HttpURLConnection
import java.net.URL

val apiKey = "your-api-key"
val apiSecret = "your-api-secret"

val nonce = (System.currentTimeMillis() / 1000).toString()
val mac = Mac.getInstance("HmacSHA256")
mac.init(SecretKeySpec(apiKey.toByteArray(), "HmacSHA256"))
val signature = mac.doFinal((apiSecret + nonce).toByteArray())
    .joinToString("") { "%02x".format(it) }

val conn = URL("https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")
    .openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", apiKey)
conn.setRequestProperty("x-nonce", nonce)
conn.setRequestProperty("x-signature", signature)
conn.doOutput = true
conn.outputStream.write("""{"prompt":"Hello, world!"}""".toByteArray())

println(conn.inputStream.bufferedReader().readText())
```

#### Dart

```dart
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

final apiKey = 'your-api-key';
final apiSecret = 'your-api-secret';

final nonce = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
final hmac = Hmac(sha256, utf8.encode(apiKey));
final signature = hmac.convert(utf8.encode(apiSecret + nonce)).toString();

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-nonce': nonce,
    'x-signature': signature,
  },
  body: jsonEncode({'prompt': 'Hello, world!'}),
);
print(response.body);
```

#### Response

```json
{
  "result": true,
  "errors": [],
  "taskid": "2221",
  "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt"
}
```

### API Key Only (Simple)

#### curl

```bash
export YOUR_API_KEY="your-api-key"

curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${YOUR_API_KEY}" \
  -d '{"prompt": "Hello, world!"}'
```

#### Python

```python
import requests

YOUR_API_KEY = "your-api-key"

response = requests.post(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
    headers={
        "x-api-key": YOUR_API_KEY,
        "Content-Type": "application/json"
    },
    json={"prompt": "Hello, world!"}
)
print(response.json())
```

#### Node.js

```javascript
const axios = require("axios");

const YOUR_API_KEY = "your-api-key";

const response = await axios.post(
  "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
  { prompt: "Hello, world!" },
  {
    headers: {
      "x-api-key": YOUR_API_KEY,
      "Content-Type": "application/json"
    }
  }
);
console.log(response.data);
```

#### PHP

```php
<?php
$apiKey = "your-api-key";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: $apiKey"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS,
    json_encode(["prompt" => "Hello, world!"]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

#### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "your-api-key");

var content = new StringContent(
    "{\"prompt\":\"Hello, world!\"}",
    Encoding.UTF8, "application/json");
var response = await client.PostAsync(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

#### Go

```go
package main

import (
    "fmt"
    "net/http"
    "strings"
    "io"
)

func main() {
    body := strings.NewReader(`{"prompt":"Hello, world!"}`)
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}", body)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "your-api-key")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
```

#### Swift

```swift
import Foundation

var request = URLRequest(url: URL(string:
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("your-api-key", forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: ["prompt": "Hello, world!"])

let (data, _) = try await URLSession.shared.data(for: request)
print(String(data: data, encoding: .utf8)!)
```

#### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val conn = URL("https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")
    .openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "your-api-key")
conn.doOutput = true
conn.outputStream.write("""{"prompt":"Hello, world!"}""".toByteArray())

println(conn.inputStream.bufferedReader().readText())
```

#### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key',
  },
  body: jsonEncode({'prompt': 'Hello, world!'}),
);
print(response.body);
```

#### Response

```json
{
  "result": true,
  "errors": [],
  "taskid": "2221",
  "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt"
}
```
