/// <reference path="../../app/App.Constants.ts" />
/// <reference path="../../app/App.Resource.ts" />
/// <reference path="../../lead/model/Lead.Model.ts" />
/// <reference path="../../offer/model/Offer.Model.ts" />
/// <reference path="../../sale/model/Sale.Model.ts" />
/// <reference path="../../common/service/Workflow.Service.ts" />
/// <reference path="../../common/model/Process.Model.ts" />
/// <reference path="../../common/model/Promise.interface.ts" />
/// <reference path="../../common/service/Workflow.Controller.ts" />
/// <reference path="../../dashboard/controller/FollowUp.Controller.ts" />

/*******************************************************************************
 * Copyright (c) 2016 Eviarc GmbH. All rights reserved.
 * 
 * NOTICE: All information contained herein is, and remains the property of
 * Eviarc GmbH and its suppliers, if any. The intellectual and technical
 * concepts contained herein are proprietary to Eviarc GmbH, and are protected
 * by trade secret or copyright law. Dissemination of this information or
 * reproduction of this material is strictly forbidden unless prior written
 * permission is obtained from Eviarc GmbH.
 ******************************************************************************/
"use strict";

const DashboardServiceId: string = "DashboardService";

class DashboardService {

    private $inject = [ProcessResourceId, toasterId, $rootScopeId, $translateId, $filterId, WorkflowServiceId, $uibModalId, $qId];

    processResource: any;
    workflowService: WorkflowService;
    toaster: any;
    translate: any;
    orderBy: any;
    rootScope: any;
    q: any;

    openLeads: Array<Process>;
    inContacts: Array<Process>;
    openOffers: Array<Process>;
    closedSales: Array<Process>;

    openLeadsValue: number = 0;
    inContactsValue: number = 0;
    openOffersValue: number = 0;
    closedSalesValue: number = 0;

    uibModal;

    user: User;
    todos: Array<Process> = [];

    constructor(ProcessResource, toaster, $rootScope, $translate, $filter, WorkflowService, $uibModal, $q) {
        this.processResource = ProcessResource.resource;
        this.workflowService = WorkflowService;
        this.toaster = toaster;
        this.rootScope = $rootScope;
        this.translate = $translate;
        this.orderBy = $filter("orderBy");
        this.q = $q;
        this.user = $rootScope.globals.user;
        this.uibModal = $uibModal;
        this.initDashboard();
        this.refreshTodos();

        $rootScope.$on("onTodosChange", (event) => {
            this.refreshTodos();
        });
        let self = this;
        setInterval(function () {
            self.refreshTodos();
        }, 5 * 60 * 1000);
    }

    initDashboard() {
        let self = this;
        this.processResource.getLeadsByStatus({ workflow: "LEAD", status: "OPEN" }).$promise.then(function (result) {
            let open: Array<Process> = new Array<Process>();
            let contact: Array<Process> = new Array<Process>();
            for (let i = 0; i < result.length; i++) {
                if (result[i].status === "OPEN") {
                    open.push(result[i]);
                }
                else if (result[i].status === "INCONTACT") {
                    contact.push(result[i]);
                }
            }
            self.openLeads = self.orderBy(open, "lead.timestamp", false);
            self.sumLeads();
            self.inContacts = self.orderBy(contact, "lead.timestamp", false);
            self.sumInContacts();
        });
        this.processResource.getOffersByStatus({ workflow: "OFFER", status: "OFFER" }).$promise.then(function (result) {
            self.openOffers = self.orderBy(result, "offer.timestamp", false);
            self.sumOffers();
        });
        this.processResource.getLatestSales().$promise.then(function (result) {
            self.closedSales = result;
            self.sumSales();
        });
    }

    sumLeads(): void {
        this.openLeadsValue = 0;
        for (let i = 0; i < this.openLeads.length; i++) {
            this.openLeadsValue += this.workflowService.sumOrderPositions(this.openLeads[i].lead.orderPositions);
        }
    }
    sumInContacts(): void {
        this.inContactsValue = 0;
        for (let i = 0; i < this.inContacts.length; i++) {
            this.inContactsValue += this.workflowService.sumOrderPositions(this.inContacts[i].lead.orderPositions);
        }
    }
    sumOffers(): void {
        this.openOffersValue = 0;
        for (let i = 0; i < this.openOffers.length; i++) {
            this.openOffersValue += this.openOffers[i].offer.offerPrice;
        }
    }
    sumSales(): void {
        this.closedSalesValue = 0;
        for (let i = 0; i < this.closedSales.length; i++) {
            this.closedSalesValue += this.closedSales[i].sale.saleTurnover;
        }
    }

    openFollowUpModal(process: Process) {
        this.uibModal.open({
            template: " <div sendfollowup parent='followUpCtrl' form='parent.emailEditForm' type='offer'></div>",
            controller: FollowUpController,
            controllerAs: "followUpCtrl",
            backdrop: "static",
            keyboard: false,
            size: "lg",
            resolve: {
                process: function () {
                    return process;
                }
            }
        });
    }

    setSortableOptions(): any {
        let self: DashboardService = this;
        return {
            update: function (e, ui) {
                let target = ui.item.sortable.droptargetModel;
                let source = ui.item.sortable.sourceModel;
                if ((self.openLeads === target && self.openOffers === source) ||
                    (self.openLeads === target && self.inContacts === source) ||
                    (self.openLeads === source && self.closedSales === target) ||
                    (self.inContacts === target && self.openOffers === source) ||
                    (self.inContacts === target && self.closedSales === source) ||
                    target === source) {
                    ui.item.sortable.cancel();
                }
            },
            stop: function (e, ui) {
                let target = ui.item.sortable.droptargetModel;
                let source = ui.item.sortable.sourceModel;
                let item = ui.item.sortable.model;
                if (self.closedSales === target && self.openOffers === source) {
                    self.startSaleTransformation(item);
                }
                else if (self.openOffers === target && self.openLeads === source
                    || self.openOffers === target && self.inContacts === source) {
                    self.startOfferTransformation(item);
                }
                else if (self.inContacts === target && self.openLeads === source) {
                    self.inContact(item);
                }
            },
            connectWith: ".connectList",
            items: "li:not(.not-sortable)"
        };
    }

    startOfferTransformation(process: Process) {
        this.workflowService.startOfferTransformation(process);
    }

    startSaleTransformation(process: Process) {
        this.workflowService.startSaleTransformation(process);
    }

    inContact(process: Process) {
        let self = this;
        this.processResource.setStatus({
            id: process.id
        }, "INCONTACT").$promise.then(function () {
            self.toaster.pop("success", "", self.translate
                .instant("COMMON_TOAST_SUCCESS_INCONTACT"));
            process.status = "INCONTACT";
            self.sumLeads();
            self.sumInContacts();
        });
    }

    getOpenLeads(): Array<Process> {
        return this.openLeads;
    }
    getInContacts(): Array<Process> {
        return this.inContacts;
    }
    getOpenOffers(): Array<Process> {
        return this.openOffers;
    }
    getClosedSales(): Array<Process> {
        return this.closedSales;
    }

    refreshTodos(): void {
        if (isNullOrUndefined(this.rootScope.globals.user)) {
            return;
        }

        this.processResource.getTodos({ processorId: this.rootScope.globals.user.id }).$promise.then((data) => {
            this.todos = this.orderByTimestamp(data);
            this.rootScope.$broadcast("todosChanged", this.todos);
        }, (error) => console.log(error));

    }

    orderByTimestamp(todos: Array<Process>): Array<Process> {
        return todos.sort((a, b) => {
            let tempA = isNullOrUndefined(a.offer) ? a.lead.timestamp : a.offer.timestamp;
            let tempB = isNullOrUndefined(b.offer) ? b.lead.timestamp : b.offer.timestamp;
            return tempA - tempB;

        });
    }
}
angular.module(moduleDashboardService, [ngResourceId]).service(DashboardServiceId, DashboardService);