using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Threading;
using System.IO;

using System.Xml;
using System.Security.Cryptography;

namespace Database
{
    partial class Program
    {

        static void Main(string[] args)
        {

            System.Threading.Thread.CurrentThread.CurrentCulture = System.Globalization.CultureInfo.CreateSpecificCulture("en-GB");

            if (args.Length < 2)
            {
                Console.WriteLine(@"
Usage: MKM [-j] <CMD> <RESOURCE> [-f FILE] [DATA]

Availible CMD: GET, PUT, POST, DEL
PUT and POST requires data, from either a file (-f) or given text (DATA).
For resources check https://www.mkmapi.eu/ws/documentation/API_2.0:Main_Page

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

            Tokens.Init();

            int argN = 0;
            bool requestJson = false;
            if (args[0].Trim().ToLower() == "-j")
            {
                requestJson = true;
                argN++;
            }

            string larg = args[argN].Trim().ToLower();

            string res = args.Length > argN + 1 ? args[argN + 1] : "";
            string data = args.Length > argN + 2 ? args[argN + 2] : "";

            if (data.Trim().ToLower() == "-f" && args.Length > argN + 3)
                data = File.ReadAllText(args[argN + 3]).TrimEnd();

            if (requestJson)
                res = "output.json/" + res;

            if (RequestTypes.ContainsKey(larg)) {
                string method = RequestTypes[larg];
                RequestHelper req = new RequestHelper();
                string respons = req.makeRequest(res, method, data);
                Console.WriteLine(respons);
            }
            else Console.WriteLine("Error: Invalid command (get/post/put/del): " + larg);

#if DEBUG
            Console.ReadKey();
#endif
        }

        private static Dictionary<string, string> RequestTypes = new Dictionary<string, string>()
        {
            { "get", "GET" },
            { "post", "POST" },
            { "put", "PUT" },
            { "del", "DELETE" },
            { "delete", "DELETE" },
        };


        static public class Tokens
        {
            public static string appToken = "";
            public static string appSecret = "";
            public static string accessToken = "";
            public static string accessSecret = "";
            public static string url = "";

            public static void Init(string filename = "tokens.txt")
            {
                if (!File.Exists(filename))
                {
                    using (System.IO.StreamWriter file = new System.IO.StreamWriter(filename))
                    {
                        file.WriteLine(@"URL= https://www.mkmapi.eu/ws/v1.1/
App token=
App secret=
Access token=
Access token secret=
");
                    }

                    Console.WriteLine("Please provide access tokens in tokens.txt. Push any key to continue");
                    Console.ReadKey();
                }

                string[] lines = File.ReadAllLines(filename);
                foreach (string s in lines)
                {
                    if (s.StartsWith("URL="))
                        url = clean(s.Split('=')[1]);
                    if (s.StartsWith("App token="))
                        appToken = clean(s.Split('=')[1]);
                    if (s.StartsWith("App secret="))
                        appSecret = clean(s.Split('=')[1]);
                    if (s.StartsWith("Access token="))
                        accessToken = clean(s.Split('=')[1]);
                    if (s.StartsWith("Access token secret="))
                        accessSecret = clean(s.Split('=')[1]);
                }

                if (appToken.Length == 0) Error("No apptoken given in " + filename);
                if (appSecret.Length == 0) Error("No appSecret given in " + filename);
                if (accessToken.Length == 0) Error("No accessToken given in " + filename);
                if (accessSecret.Length == 0) Error("No accessSecret given in " + filename);
                if (url.Length == 0) Error("No url given in " + filename);
            }

            static string clean(string text)
            {
                text = text.Replace("\r", "").Replace("\n", "");
                text = text.Replace("\t", "");
                text = text.Replace("\"", "");
                text = text.Replace("'", "");
                return text.Trim();
            }
            static void Error(string msg)
            {
                Console.WriteLine("Error: " + msg);
                Environment.Exit(1);
            }
        }




        class RequestHelper
        {
            public string makeRequest(string resource, String method = "GET", String postData = "")
            {
                String url = Tokens.url + resource;

                System.Net.ServicePointManager.Expect100Continue = false;

                HttpWebRequest request = WebRequest.Create(url) as HttpWebRequest;

                OAuthHeader header = new OAuthHeader();
                request.Headers.Add(HttpRequestHeader.Authorization, header.getAuthorizationHeader(method, url));
                request.Method = method;

                if (postData.Length > 0 && (method == "POST" || method == "PUT"))
                {
                    XmlDocument soapEnvelopeXml = new XmlDocument();
                    soapEnvelopeXml.LoadXml(postData);
                    using (Stream stream = request.GetRequestStream())
                    {
                        soapEnvelopeXml.Save(stream);
                    }

                    request.ContentType = "application/xml;charset=\"utf-8\"";
                    request.Accept = "application/json,application/xml";
                }

                HttpWebResponse response;
                try
                {
                    response = request.GetResponse() as HttpWebResponse;
                    byte[] b = ReadFully(response.GetResponseStream());
                    return Encoding.UTF8.GetString(b, 0, b.Length);
                }

                catch (System.Net.WebException ex)
                {
                    Console.WriteLine("Error: " + ex.Message);
                    response = ex.Response as HttpWebResponse;
                    if (response.StatusCode == HttpStatusCode.Unauthorized)
                    {
                        Console.WriteLine(@"App token = '{0}'
App secret = '{1}'
Access token = '{2}'
Access token secret = '{3}'", Tokens.appToken, Tokens.appSecret, Tokens.accessToken, Tokens.accessSecret);
                    }
                    return "";
                }

                catch (Exception ex)
                {
                    Console.WriteLine("Error: " + ex.Message);
                    return "";
                }

            }


            public static byte[] ReadFully(Stream input)
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    input.CopyTo(ms);
                    return ms.ToArray();
                }
            }

        }

        /// <summary>
        /// Class encapsulates tokens and secret to create OAuth signatures and return Authorization headers for web requests.
        /// </summary>
        class OAuthHeader
        {
            /// <summary>App Token</summary>
            String appToken = "";
            /// <summary>App Secret</summary>
            String appSecret = "";
            /// <summary>Access Token (Class should also implement an AccessToken property to set the value)</summary>
            String accessToken = "";
            /// <summary>Access Token Secret (Class should also implement an AccessToken property to set the value)</summary>
            String accessSecret = "";
            /// <summary>OAuth Signature Method</summary>
            protected String signatureMethod = "HMAC-SHA1";
            /// <summary>OAuth Version</summary>
            protected String version = "1.0";
            /// <summary>All Header params compiled into a Dictionary</summary>
            protected IDictionary<String, String> headerParams;

            /// <summary>
            /// Constructor
            /// </summary>
            public OAuthHeader()
            {
                String nonce = Guid.NewGuid().ToString("n");
                //String nonce = "53eb1f44909d6";
                String timestamp = ((int)((DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1))).TotalSeconds)).ToString();
                // String timestamp = "1407917892";

                /// Initialize all class members
                this.appToken = Tokens.appToken;
                this.appSecret = Tokens.appSecret;
                this.accessToken = Tokens.accessToken;
                this.accessSecret = Tokens.accessSecret;

                this.headerParams = new Dictionary<String, String>();
                this.headerParams.Add("oauth_consumer_key", this.appToken);
                this.headerParams.Add("oauth_token", this.accessToken);
                this.headerParams.Add("oauth_nonce", nonce);
                this.headerParams.Add("oauth_timestamp", timestamp);
                this.headerParams.Add("oauth_signature_method", this.signatureMethod);
                this.headerParams.Add("oauth_version", this.version);
            }


            /// <summary>
            /// Pass request method and URI parameters to get the Authorization header value
            /// </summary>
            /// <param name="method">Request Method</param>
            /// <param name="url">Request URI</param>
            /// <returns>Authorization header value</returns>
            public String getAuthorizationHeader(String method, String url)
            {
                var URIparts = url.Split('?');
                string baseURI = URIparts[0];

                /// Add the realm parameter to the header params
                //string realm = new Uri(url).Host;
                string realm = baseURI;

                this.headerParams.Add("realm", realm);

                /// Start composing the base string from the method and request URI
                string baseString = method.ToUpper()
                                  + "&"
                                  + Uri.EscapeDataString(baseURI)
                                  + "&";


                string[] requestParameters = URIparts.Count() > 1 ? URIparts[1].Split('&') : new string[] { };
                foreach (var parameter in requestParameters)
                {
                    var parts = parameter.Split('=');
                    string key = parts[0];
                    string value = parts.Count() > 1 ? parts[1] : "";
                    headerParams.Add(key, value);
                }


                /// Gather, encode, and sort the base string parameters
                SortedDictionary<String, String> encodedParams = new SortedDictionary<String, String>();
                foreach (var parameter in this.headerParams)
                {
                    if (!parameter.Key.Equals("realm"))
                    {
                        encodedParams.Add(Uri.EscapeDataString(parameter.Key), Uri.EscapeDataString(parameter.Value));
                    }
                }

                /// Expand the base string by the encoded parameter=value pairs
                List<String> paramStrings = new List<String>();
                foreach (KeyValuePair<String, String> parameter in encodedParams)
                {
                    paramStrings.Add(parameter.Key + "=" + parameter.Value);
                }
                String paramString = Uri.EscapeDataString(String.Join<String>("&", paramStrings));
                baseString += paramString;

                /// Create the OAuth signature
                String signatureKey = Uri.EscapeDataString(this.appSecret) + "&" + Uri.EscapeDataString(this.accessSecret);
                HMAC hasher = HMACSHA1.Create();
                hasher.Key = Encoding.UTF8.GetBytes(signatureKey);
                Byte[] rawSignature = hasher.ComputeHash(Encoding.UTF8.GetBytes(baseString));
                String oAuthSignature = Convert.ToBase64String(rawSignature);

                /// Include the OAuth signature parameter in the header parameters array
                this.headerParams.Add("oauth_signature", oAuthSignature);

                /// Construct the header string
                List<String> headerParamStrings = new List<String>();
                foreach (KeyValuePair<String, String> parameter in this.headerParams)
                {
                    headerParamStrings.Add(parameter.Key + "=\"" + parameter.Value + "\"");
                }
                String authHeader = "OAuth " + String.Join<String>(", ", headerParamStrings);

                return authHeader;
            }
        }

    }

}
