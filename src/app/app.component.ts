import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { RequestsDataInTask, ListDetail, Request, RequestStatus } from './requests';

import { AppService } from './app.service';
import { PagerService } from './_services/index';
import { AppSettings } from './app.global';
import { RestCalls } from './app.component.rest';
import * as $ from 'jquery';
import * as _ from 'lodash';
import { Task } from './tasks';
import { User, UesrGroup } from './users';
import { filter } from 'rxjs/operators/filter';
import 'datatables.net';
import 'datatables.net-bs4';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
 // styleUrls: ['./app.component.css'],
  providers: [AppService, AppSettings, RestCalls]
})
export class AppComponent implements OnInit {
  allAssignedTasks: Task[] = new Array<Task>();
  allCompletedTasks: Task[] = new Array<Task>();
  allCreatedRequests: Request[] = new Array<Request>();

  dataTable: any;

  // pager object
  allAssignedTasksPager: any = {};
  allCompletedTasksPager: any = {};
  allCreatedRequestsPager: any = {};

  // paged items
  allAssignedTasksPagedItems: any[];
  allCompletedTasksPagedItems: any[];
  allCreatedrequestsPagedItems: any[];

  constructor(
    private _appService: AppService, private _global: AppSettings, private _restCalls: RestCalls, private pagerService: PagerService, private cd: ChangeDetectorRef,) {
  }
  ngOnInit() {



    $("input:checkbox").on('click', function() {
      // in the handler, 'this' refers to the box clicked on
      var $box = $(this);
      if ($box.is(":checked")) {
        // the name of the box is retrieved using the .attr() method
        // as it is assumed and expected to be immutable
        var group = "input:checkbox[name='" + $box.attr("name") + "']";
        // the checked state of the group/box on the other hand will change
        // and the current value is retrieved using .prop() method
        $(group).prop("checked", false);
        $box.prop("checked", true);
      } else {
        $box.prop("checked", false);
      }
    });

    
 

    this.getAssignedTasks('');
    this.getCompletedTasks();
    this.getCreatedRequests();
  }

  approved(filterPassed){
    console.log(filterPassed);
    if(filterPassed == 1){
      // this.allAssignedTasks['TaskOutcome']
      this.getAssignedTasks(filterPassed);

    }
  }

  getAssignedTasks(filterPassed): void {
    
    const allTasksListNames: string[] = this._global.allTasks;

    const select = this._global.select_Tasks;
    const orderBy = this._global.orderby_Tasks;
    this._restCalls.getCurrentUserData().then(
      (userData) => {
        if (userData) {
          const returnedUser = <User>userData;
          this._restCalls.getCurrentUserGroupData(returnedUser.Id).then(
            (userGroupData) => {
              if (userGroupData) {
                const returnedUserGroups = <UesrGroup[]>userGroupData;
                let filterValue = this._global.filterby_Lists;
                returnedUserGroups.forEach(userGroup => {
                  filterValue = filterValue + 'AssignedToId eq ' + userGroup.Id + ' or ';
                });
                filterValue = filterValue.substring(0, filterValue.length - 4);
                if(filterPassed != ''){
                  filterValue = filterValue + filterPassed;
                }
                
                allTasksListNames.forEach(taskListName => {
                  this._restCalls.getListDataByTitle(select, orderBy, filterValue, taskListName).then(
                    (data) => {
                      if (data) {
                        const returnedTasks = <Task[]>data;
                        returnedTasks.forEach(tempTask => {
                          let listDetails: ListDetail = null;
                          let relatedItem: RequestsDataInTask = null;
                          const pushedTask: Task = tempTask;
                          const jsonObject: any = JSON.parse(tempTask.RelatedItems);
                          console.log(jsonObject);
                          if (jsonObject !== null && jsonObject.length > 0) {
                            relatedItem = <RequestsDataInTask>jsonObject[0];
                            this._restCalls.getListByGuid(this._global.select_ListDetails, relatedItem.ListId).then(
                              (listData) => {
                                listDetails = <ListDetail>listData;
                                const listName = listDetails.EntityTypeName.substring(0, listDetails.EntityTypeName.indexOf('List'));
                                pushedTask.RelatedItemsUrl = this._global.siteURL + '/Lists/' + listName +
                                  '/DispForm.aspx?ID=' + relatedItem.ItemId;
                              });
                          }
                          pushedTask.TaskItemUrl = this._global.siteURL + '/Lists/' + taskListName +
                            '/DispForm.aspx?ID=' + pushedTask.ID;
                          this.allAssignedTasks.push(pushedTask);
                        });
                        this.setAssignedTasksPage(1);
                      }
                    });
                });
             

              }
            });
        }
      });
  }


  setAssignedTasksPage(page: number) {
    if (page < 1 || page > this.allAssignedTasksPager.totalPages) {
      return;
    }
    // get pager object from service
    this.allAssignedTasksPager = this.pagerService.getPager(this.allAssignedTasks.length, page);

    // get current page of items
    this.allAssignedTasksPagedItems = this.allAssignedTasks.slice(this.allAssignedTasksPager.startIndex,
      this.allAssignedTasksPager.endIndex + 1);

      this.cd.detectChanges();
      $('#myPendingTasks').DataTable().destroy();
      var table: any = $('#myPendingTasks').DataTable({

        language: {
          search: "<span >Search</span>",
          searchPlaceholder: "TaskOutcome/ Task Current Status/ Status"
        },
        "paging": false,

        columnDefs: [{ orderable: false, targets: [1] }, { searchable: false, targets: [1] }],
        //columnDefs: [{  }, {  }],
      });
      this.dataTable = table;
  }

  getCompletedTasks(): void {
    const allTasksListNames: string[] = this._global.allTasks;
    const select = this._global.select_Tasks;
    const orderBy = this._global.orderby_Tasks;
    this._restCalls.getCurrentUserData().then(
      (userData) => {
        if (userData) {
          const returnedUser = <User>userData;
          const filterValue = this._global.filterby_Completed_Lists + returnedUser.Id + ')';
          allTasksListNames.forEach(taskListName => {
            this._restCalls.getListDataByTitle(select, orderBy, filterValue, taskListName).then(
              (data) => {
                if (data) {
                  const returnedTasks = <Task[]>data;
                  returnedTasks.forEach(tempTask => {
                    let listDetails: ListDetail = null;
                    let relatedItem: RequestsDataInTask = null;
                    const pushedTask: Task = tempTask;
                    const jsonObject: any = JSON.parse(tempTask.RelatedItems);
                    if (jsonObject !== null && jsonObject.length > 0) {
                      relatedItem = <RequestsDataInTask>jsonObject[0];
                      this._restCalls.getListByGuid(this._global.select_ListDetails, relatedItem.ListId).then(
                        (listData) => {
                          listDetails = <ListDetail>listData;
                          const listName = listDetails.EntityTypeName.substring(0, listDetails.EntityTypeName.indexOf('List'));
                          pushedTask.RelatedItemsUrl = this._global.siteURL + '/Lists/' + listName +
                            '/DispForm.aspx?ID=' + relatedItem.ItemId;
                        });
                    }
                    pushedTask.TaskItemUrl = this._global.siteURL + '/Lists/' + taskListName +
                      '/DispForm.aspx?ID=' + pushedTask.ID;
                    this.allCompletedTasks.push(pushedTask);
                  });
                  this.setCompletedTasksPage(1);
                }
              });
          });
        }
      });
    //  }
    //  });
  }

  setCompletedTasksPage(page: number) {
    if (page < 1 || page > this.allCompletedTasksPager.totalPages) {
      return;
    }
    // get pager object from service
    this.allCompletedTasksPager = this.pagerService.getPager(this.allCompletedTasks.length, page);

    // get current page of items
    this.allCompletedTasksPagedItems = this.allCompletedTasks.slice(this.allCompletedTasksPager.startIndex,
      this.allCompletedTasksPager.endIndex + 1);
  }

  getCreatedRequests(): void {
    const allRequestListNames: string[] = this._global.allRequests;
    const select = this._global.select_Requests;
    const orderBy = this._global.orderby_Requests;
    this._restCalls.getCurrentUserData().then(
      (userData) => {
        if (userData) {
          const returnedUser = <User>userData;

          let filterValue = this._global.filterby_Lists;
          filterValue = filterValue + 'AuthorId eq ' + returnedUser.Id;
          allRequestListNames.forEach(taskListName => {
            this._restCalls.getListDataByTitle(select, orderBy, filterValue, taskListName).then(
              (data) => {
                if (data) {
                  const returnedRequests = <Request[]>data;
                  returnedRequests.forEach(tempRequest => {
                    const requestStatus = <RequestStatus>tempRequest.HFM_x0020_Business_x0020_Rule_x0;
                    const pushedRequest: Request = tempRequest;
                    tempRequest.ViewStatusText = requestStatus.Description;
                    tempRequest.ViewStatusUrl = requestStatus.Url;
                    this.allCreatedRequests.push(pushedRequest);
                  });
                  this.setRequestsPage(1);
                }
              });
          });
        }
      });
  }

  setRequestsPage(page: number) {
    if (page < 1 || page > this.allCreatedRequestsPager.totalPages) {
      return;
    }
    // get pager object from service
    this.allCreatedRequestsPager = this.pagerService.getPager(this.allCreatedRequests.length, page);

    // get current page of items
    this.allCreatedrequestsPagedItems = this.allCreatedRequests.slice(this.allCreatedRequestsPager.startIndex,
      this.allCreatedRequestsPager.endIndex + 1);
  }
}
