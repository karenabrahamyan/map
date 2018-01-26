import {Pipe} from '@angular/core';
import {Http, Response} from '@angular/http';

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw'

@Pipe({
  name: 'request',
})
export class RequestPipe {
  apiUrl: string = "http://araratbank.first.am/public/api";
  getNearLocations: string = "/entity/getnearest";
  request_single: string = "/entity/getEntity/";

  constructor(private http: Http) {

  }

  single(id, type, lang) {
    if (lang == 'am') {
      lang = 'hy';
    }
    if (!lang) {
      lang = 'en';
    }
    return this.http.get(this.apiUrl + this.request_single + id + "/" + type + "/" + lang)
      .map((res: Response) => res.json());
  }

  getNearByLocations(current_location, lang = "en") {
    if (lang == 'am') {
      lang = 'hy';
    }
    if (!lang) {
      lang = 'en';
    }
    return this.http.get(this.apiUrl + this.getNearLocations + "/" + current_location.lat + "/" + current_location.lng + "/" + lang)
      .map((res: Response) => res.json());
  }

}
