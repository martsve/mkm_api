using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using Newtonsoft.Json;

namespace MkmApi
{
    class Program
    {
        private const string BaseUrl = "https://api.cardmarket.com/ws";
        private const string DocUrl = "documentation/API_2.0:Main_Page";
        private const string ApiUrl = "v2.0/";

        private static readonly Dictionary<string, HttpMethod> RequestTypes = new Dictionary<string, HttpMethod>()
        {
            {"get", HttpMethod.Get },
            {"post", HttpMethod.Post },
            {"put", HttpMethod.Put },
            {"del", HttpMethod.Delete },
            {"delete", HttpMethod.Delete },
        };

        public static void Error(string message)
        {
            Console.Error.WriteLine(message);
            Environment.Exit(1);
        }

        public static void Main(string[] args)
        {
            System.Threading.Thread.CurrentThread.CurrentCulture =
                System.Globalization.CultureInfo.CreateSpecificCulture("en-GB");

            if (args.Length < 2)
            {
                Console.WriteLine($@"
Usage: MKM [-j] <CMD> <RESOURCE> [-f FILE] [DATA]

Availible CMD: GET, PUT, POST, DEL
PUT and POST requires data, from either a file (-f) or given text (DATA).
For resources check {BaseUrl}/{DocUrl}

All data should be given/received as UTF8.

Use -j option to receive JSON.

If tokens.txt does not exist, the program will pause while it waits for you to
fill in the created tokens.txt file

Examples:

  MKM GET account
  
  MKM GET stock/1 
  
  MKM DEL shoppingcart

  MKM GET orders/2/8 > received.txt
                ");

                Environment.Exit(1);
            }

            var tokens = new Tokens();

            var argN = 0;
            bool requestJson = false;
            if (args[0].Trim().ToLower() == "-j")
            {
                requestJson = true;
                argN++;
            }


            var larg = args[argN].Trim().ToLower();

            var res = args.Length > argN + 1 ? args[argN + 1] : "";
            var data = args.Length > argN + 2 ? args[argN + 2] : "";

            if (data.Trim().ToLower() == "-f" && args.Length > argN + 3)
                data = File.ReadAllText(args[argN + 3]).TrimEnd();

            if (requestJson)
            {
                res = "output.json/" + res;
            }
            
            if (!RequestTypes.ContainsKey(larg))
            {
                Error("Error: Invalid command (get/post/put/del): " + larg);

            }

            var method = RequestTypes[larg];
            var req = new RequestHelper(tokens);
            var respons = req.MakeRequest(res, method, data);
            Console.WriteLine(respons);
        }
        
        public class Tokens
        {
            public string AppToken { get; set; } = "";
            public string AppSecret { get; set; } = "";
            public string AccessToken { get; set; } = "";
            public string AccessSecret { get; set; } = "";
            public string Url { get; set; } = "";

            public Tokens(string filename = "tokens.txt")
            {
                if (!File.Exists(filename))
                {
                    using (var file = new StreamWriter(filename))
                    {
                        file.WriteLine($@"URL={BaseUrl}/{ApiUrl}
App token=
App secret=
Access token=
Access token secret=
");
                    }

                    Error("Please provide access tokens in tokens.txt.");
                }

                var lines = File.ReadAllLines(filename).Select(x => x.Trim());
                foreach (var s in lines)
                {
                    if (s.StartsWith("URL="))
                        Url = Clean(s.Split('=')[1]);
                    if (s.StartsWith("App token="))
                        AppToken = Clean(s.Split('=')[1]);
                    if (s.StartsWith("App secret="))
                        AppSecret = Clean(s.Split('=')[1]);
                    if (s.StartsWith("Access token="))
                        AccessToken = Clean(s.Split('=')[1]);
                    if (s.StartsWith("Access token secret="))
                        AccessSecret = Clean(s.Split('=')[1]);
                }

                if (AppToken.Length == 0) Error("No apptoken given in " + filename);
                if (AppSecret.Length == 0) Error("No appSecret given in " + filename);
                if (AccessToken.Length == 0) Error("No accessToken given in " + filename);
                if (AccessSecret.Length == 0) Error("No accessSecret given in " + filename);
                if (Url.Length == 0) Error("No url given in " + filename);
            }

            private string Clean(string text)
            {
                text = text.Replace("\r", "").Replace("\n", "");
                text = text.Replace("\t", "");
                text = text.Replace("\"", "");
                text = text.Replace("'", "");
                return text.Trim();
            }
        }

        public class RequestHelper
        {
            private Tokens Tokens { get; }

            public RequestHelper(Tokens tokens)
            {
                Tokens = tokens;
            }

            public string MakeRequest(string resource, HttpMethod method, string postData)
            {
                var url = Tokens.Url + resource;
                var contentType = resource.Contains("output.json") ? "json" : "xml";

                ServicePointManager.Expect100Continue = false;

                using (var client = new HttpClient())
                {
                    var header = new OAuthHeader(Tokens);
                    client.DefaultRequestHeaders.Add("Authorization", header.GetAuthorizationHeader(method, url));

                    var request = new HttpRequestMessage(method, url);
                    request.Headers.TryAddWithoutValidation("Accept", $"application/{contentType}");

                    if (postData.Length > 0)
                    {
                        request.Content = new StringContent(postData, Encoding.UTF8, $"application/{contentType}");
                    }

                    HttpResponseMessage response = null;
                    try
                    {
                        response = client.SendAsync(request).Result;
                    }
                    catch (Exception ex)
                    {
                        Error("Error: " + ex.Message);
                    }

                    if (!response.IsSuccessStatusCode)
                    {
                        Error($"Error: Server returned {response.StatusCode}: {response.ReasonPhrase}");
                    }

                    var result = response.Content.ReadAsStringAsync().Result;

                    return contentType == "json" ? FormatJson(result) : result;
                }
            }

            private static string FormatJson(string json)
            {
                dynamic parsedJson = JsonConvert.DeserializeObject(json);
                return JsonConvert.SerializeObject(parsedJson, Formatting.Indented);
            }
        }

        /// <summary>
        /// Class encapsulates tokens and secret to create OAuth signatures and return Authorization headers for web requests.
        /// </summary>
        class OAuthHeader
        {
            private const string SignatureMethod = "HMAC-SHA1";
            private const string Version = "1.0";

            private Tokens Tokens { get; }

            private readonly IDictionary<string, string> _headerParams;

            public OAuthHeader(Tokens tokens)
            {
                Tokens = tokens;

                var nonce = Guid.NewGuid().ToString("n");
                var timestamp = ((int) ((DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1))).TotalSeconds)).ToString();

                _headerParams = new Dictionary<string, string>
                {
                    {"oauth_consumer_key", Tokens.AppToken},
                    {"oauth_token", Tokens.AccessToken},
                    {"oauth_nonce", nonce},
                    {"oauth_timestamp", timestamp},
                    {"oauth_signature_method", SignatureMethod},
                    {"oauth_version", Version}
                };
            }
            
            /// <summary>
            /// Pass request method and URI parameters to get the Authorization header value
            /// </summary>
            /// <param name="method">Request Method</param>
            /// <param name="url">Request URI</param>
            /// <returns>Authorization header value</returns>
            public string GetAuthorizationHeader(HttpMethod method, string url)
            {
                var uriParts = url.Split('?');
                var baseUri = uriParts[0];

                var realm = baseUri;

                _headerParams.Add("realm", realm);

                var baseString = method.Method.ToUpper()
                                 + "&"
                                 + Uri.EscapeDataString(baseUri)
                                 + "&";

                var requestParameters = uriParts.Count() > 1 ? uriParts[1].Split('&') : new string[] { };
                foreach (var parameter in requestParameters)
                {
                    var parts = parameter.Split('=');
                    var key = parts[0];
                    var value = parts.Count() > 1 ? parts[1] : "";
                    _headerParams.Add(key, Uri.UnescapeDataString(value));
                }

                var encodedParams = new SortedDictionary<string, string>();
                foreach (var parameter in _headerParams)
                {
                    if (!parameter.Key.Equals("realm"))
                    {
                        encodedParams.Add(Uri.EscapeDataString(parameter.Key), Uri.EscapeDataString(parameter.Value));
                    }
                }

                var paramStrings = encodedParams.Select(parameter => parameter.Key + "=" + parameter.Value).ToList();
                var paramString = Uri.EscapeDataString(string.Join<string>("&", paramStrings));
                baseString += paramString;

                var signatureKey = Uri.EscapeDataString(Tokens.AppSecret) + "&" + Uri.EscapeDataString(Tokens.AccessSecret);
                var hasher = HMACSHA1.Create("HMACSHA1");
                hasher.Key = Encoding.UTF8.GetBytes(signatureKey);
                var rawSignature = hasher.ComputeHash(Encoding.UTF8.GetBytes(baseString));
                var oAuthSignature = Convert.ToBase64String(rawSignature);

                _headerParams.Add("oauth_signature", oAuthSignature);

                var headerParamStrings =
                    _headerParams.Select(parameter => parameter.Key + "=\"" + parameter.Value + "\"").ToList();

                var authHeader = "OAuth " + string.Join<string>(", ", headerParamStrings);

                return authHeader;
            }
        }
    }
}
