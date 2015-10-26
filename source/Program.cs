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
            if (args.Length < 2)
            {
                Console.WriteLine(@"
Usage: MKM <CMD> <RESOURCE> [-f FILE] [DATA]

Availible CMD: GET, PUT, POST, DEL
PUT and POST requires data, from either a file (-f) or given text (DATA).
For resources check https://www.mkmapi.eu/ws/documentation/API_1.1:Main_Page

All data should be given/received as UTF8

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

            string larg = args[0].Trim().ToLower();

            if (larg == "get")
            {
                string method = "GET";
                string res = args.Length > 1 ? args[1] : "";

                RequestHelper req = new RequestHelper();
                string respons = req.makeRequest(res, method);
                Console.WriteLine(respons);
            }

            else if (larg == "post")
            {
                string method = "POST";
                string res = args.Length > 1 ? args[1] : "";
                string data = args.Length > 2 ? args[2] : "";

                if (data.Trim().ToLower() == "-f" && args.Length > 3)
                    data = File.ReadAllText(args[3]);

                RequestHelper req = new RequestHelper();
                string respons = req.makeRequest(res, method, data.TrimEnd());
                Console.WriteLine(respons);
            }


            else if (larg == "put")
            {
                string method = "PUT";
                string res = args.Length > 1 ? args[1] : "";
                string data = args.Length > 2 ? args[2] : "";

                if (data.Trim().ToLower() == "-f" && args.Length > 3)
                    data = File.ReadAllText(args[3]);

                RequestHelper req = new RequestHelper();
                string respons = req.makeRequest(res, method, data.TrimEnd());
                Console.WriteLine(respons);
            }

            else if (larg == "del")
            {
                string method = "DELETE";
                string res = args.Length > 1 ? args[1] : "";

                RequestHelper req = new RequestHelper();
                string respons = req.makeRequest(res, method);
                Console.WriteLine(respons);
            }

            else Console.WriteLine("Error: Invalid command (get/post/put/del): " + larg);

#if DEBUG
            Console.ReadKey();
#endif
        }




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
                        file.WriteLine(@"URL=https://www.mkmapi.eu/ws/v1.1/
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
            public XmlDocument makeXMLRequest(string resource, String method = "GET", String postData = "")
            {
                XmlDocument doc = new XmlDocument();
                string res = makeRequest(resource, method = "GET", postData = "");
                doc.Load(res);
                return doc;
            }

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

                    request.ContentType = "text/xml;charset=\"utf-8\"";
                    request.Accept = "text/xml";
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
                String timestamp = (DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1))).TotalSeconds.ToString();
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
                /// Add the realm parameter to the header params
                this.headerParams.Add("realm", url);

                /// Start composing the base string from the method and request URI
                String baseString = method.ToUpper()
                                  + "&"
                                  + Uri.EscapeDataString(url)
                                  + "&";

                /// Gather, encode, and sort the base string parameters
                SortedDictionary<String, String> encodedParams = new SortedDictionary<String, String>();
                foreach (KeyValuePair<String, String> parameter in this.headerParams)
                {
                    if (false == parameter.Key.Equals("realm"))
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
