import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpEvent } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

const API_HOST = environment.apiHost;

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json', 
    'Access-Control-Allow-Origin': 'http://localhost:8100/',
    'Access-Control-Allow-Credentials': 'true'
  })
  };

  token: string;

  constructor(private http: HttpClient) {
  }

  static handleError(error: Error) {
    alert(error.message);
  }

  static extractData(res: HttpEvent<any>) {
    const body = res;
    return body || { };
  }

  setAuthToken(token) {
    this.httpOptions.headers = this.httpOptions.headers.append('Authorization', `jwt ${token}`);
    this.token = token;
  }

  get(endpoint): Promise<any> {
    const url = `${API_HOST}${endpoint}`;
    const req = this.http.get(url, this.httpOptions).pipe(map(ApiService.extractData));

    return req
            .toPromise()
            .catch((e) => {
              ApiService.handleError(e);
              throw e;
            });
  }

  post(endpoint, data): Promise<any> {
    const url = `${API_HOST}${endpoint}`;
    return this.http.post<HttpEvent<any>>(url, data, this.httpOptions)
            .toPromise()
            .catch((e) => {
              ApiService.handleError(e);
              throw e;
            });
  }

  async upload(endpoint: string, file: File, payload: any): Promise<any> {
    console.log(endpoint)
    const signed_url = (await this.get(`${endpoint}/signed-url/${file.name}`)).url;
     const signed_url_aws = (await this.get(`http://localhost:8080/api/v0/feed/signed-url/${file.name}`)).url
    const demo_url = `http://localhost:8080/api/v0/feed/signed-url/${file.name}`
    console.log(signed_url)
    // header('Access-Control-Allow-Origin: *')
    const headers = new HttpHeaders({'Content-Type': file.type});
    headers.append('Access-Control-Allow-Origin', '*');
    headers.append('Access-Control-Allow-Credentials', 'true');
    const req = new HttpRequest( 'GET', signed_url_aws, file,
                                  {
                                    headers: headers,
                                    reportProgress: true, // track progress
                                  });
    console.log(req)
    return new Promise ( resolve => {
        this.http.request(req).subscribe((resp) => {
          console.log(resp)
        if (resp && (<any> resp).status && (<any> resp).status === 200) {
          resolve(this.post('http://localhost:8080/api/v0/feed', payload));
        }
      });
    });
  }
}
