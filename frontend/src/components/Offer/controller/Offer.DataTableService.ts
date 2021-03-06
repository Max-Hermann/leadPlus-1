/// <reference path="../../app/App.Common.ts" />
/// <reference path="../../User/Model/User.Model.ts" />
/// <reference path="../../Process/model/Process.Model.ts" />
/// <reference path="../../Workflow/controller/Workflow.Service.ts" />

const OfferDataTableServiceId: string = "OfferDataTableService";
const allDataOfferRoute: string = "/api/rest/processes/offers";
const openDataOfferRoute: string = "/api/rest/processes/offers/open";

class OfferDataTableService implements IDatatableService {

    $inject = [DTOptionsBuilderId, DTColumnBuilderId, $filterId, $compileId, $rootScopeId, $translateId, WorkflowServiceId, WorkflowDatatableServiceId, TokenServiceId, $httpId];

    workflowService: WorkflowService;
    workflowDatatableService: WorkflowDatatableService;
    translate;
    dtOptions;
    dtColumns;
    DTOptionsBuilder;
    DTColumnBuilder;
    filter;
    compile;
    rootScope;

    constructor(DTOptionsBuilder, DTColumnBuilder, $filter, $compile, $rootScope, $translate, WorkflowService, WorkflowDatatableService, private TokenService: TokenService, private $http) {
        this.translate = $translate;
        this.DTOptionsBuilder = DTOptionsBuilder;
        this.DTColumnBuilder = DTColumnBuilder;
        this.filter = $filter;
        this.compile = $compile;
        this.rootScope = $rootScope;
        this.workflowService = WorkflowService;
        this.workflowDatatableService = WorkflowDatatableService;
    }

    getDTOptionsConfiguration(createdRow: Function, defaultSearch: string = "") {
        let self = this;
        return this.DTOptionsBuilder.newOptions()
            .withOption("searchDelay", 600)
            .withOption("ajax", self.getInitData())
            .withOption("stateSave", false)
            .withOption("serverSide", true)
            .withDOM(this.workflowDatatableService.getDomString())
            .withPaginationType("full_numbers")
            .withButtons(this.workflowDatatableService.getButtons(this.translate("OFFER_OFFERS"), [8, 3, 2, 4, 7, 6, 9, 10, 11, 12, 13]))
            .withBootstrap()
            .withOption("createdRow", createdRow)
            .withOption("deferRender", false)
            .withOption("lengthMenu", [10, 20, 50])
            .withOption("order", [6, "desc"])
            .withOption("search", { "search": defaultSearch })
            .withLanguageSource(this.workflowDatatableService.getLanguageSource(this.rootScope.language));
    }

    async getInitData() {
        let self = this;
        return {
            url: openDataOfferRoute,
            type: "GET",
            pages: 2,
            dataSrc: "data",
            data: function (d) {
                d.userId = self.workflowDatatableService.showMyTasksUserId["OFFER"];
            },
            error: function (xhr, error, thrown) {
                handleError(xhr);
            },
            beforeSend: function (request) {
                request.setRequestHeader("X-Authorization", "Bearer " + self.TokenService.getAccessTokenInstant());
            }
        };
    }

    configRow(row: any, data: Process) {
        let currentDate = moment(newTimestamp(), "DD.MM.YYYY");
        let offerDate = moment(data.offer.timestamp, "DD.MM.YYYY");
        let self = this;
        $(row).attr("id", "id_" + data.id);
        $("td:not(:last-child)", row).unbind("click");
        $("td:not(:last-child)", row).bind("click", function () {
            self.rootScope.$broadcast(broadcastClickChildrow, data);
        }).css("cursor", "pointer");

        if ((currentDate["businessDiff"](offerDate, "days") > 3 && data.status === "OFFER")
            || (currentDate["businessDiff"](offerDate, "days") > 5 && data.status === "FOLLOWUP")) {
            $(row).addClass("important");
        }
    }

    getDetailHTML(id: number): string {
        return "<a id='id_" + id + "' class='green shortinfo' href='javascript:;'"
            + "ng-click='offerCtrl.appendChildRow(" + id + ")' title='Details'>"
            + "<i class='glyphicon glyphicon-plus-sign'/></a>";
    }

    getDTColumnConfiguration(addDetailButton: Function, addStatusStyle: Function, addActionsButtons: Function): Array<any> {
        let self = this;
        return [
            /*this.DTColumnBuilder.newColumn(null).withTitle("").notSortable()
                .renderWith(addDetailButton),*/
            this.DTColumnBuilder.newColumn(null).withTitle(
                "<i style='margin-top:2px;margin-left:12px;' class='fa fa-thumb-tack' aria-hidden='true'></i>").withClass("text-center").renderWith(function (data: Process, type, full) {
                    if (data.processor != null && data.processor.thumbnail != null) {
                        return `<div style="height:45px;">
                    <img title="` + data.processor.firstname + ` ` + data.processor.lastname + `" style="width: 45px; height:45px;border-radius: 10%;"
                    pictureid="` + data.processor.thumbnail.id + `" httpsrc="/api/rest/files/content/" alt="">
                </div>`;
                    } else if (data.processor != null && data.processor.thumbnail == null && data.processor.firstname != null && data.processor.lastname != null) {
                        return "<span style='font-weight:bold' title='" + data.processor.firstname + " " + data.processor.lastname + "'>" + data.processor.firstname[0] + data.processor.lastname[0] + "</span>";
                    } else {
                        return "-";
                    }
                }).withOption("width", "45px").notSortable(),
            this.DTColumnBuilder.newColumn(null).renderWith(
                function (data: Process, type, full) {
                    if (data != null && data.processor != null) {
                        return data.processor.email;
                    } else {
                        return "";
                    }
                }).notVisible(),
            this.DTColumnBuilder.newColumn("offer.customer.company").withTitle(
                this.translate("COMMON_COMPANY")).withClass("text-center"),
            this.DTColumnBuilder.newColumn("offer.customer.lastname").withTitle(
                this.translate("COMMON_NAME")).withClass("text-center"),
            this.DTColumnBuilder.newColumn("offer.customer.email").withTitle(
                this.translate("COMMON_EMAIL")).notVisible(),
            this.DTColumnBuilder.newColumn(null).withTitle(
                this.translate("COMMON_PRODUCT_DESTINATION")).withClass("text-center").renderWith(function (data, type, full) {
                    let zip = "";
                    let city = "";
                    let country = "";
                    !isNullOrUndefined(data.offer.deliveryAddress.zip) ? zip = data.offer.deliveryAddress.zip : angular.noop;
                    !isNullOrUndefined(data.offer.deliveryAddress.city) ? city = data.offer.deliveryAddress.city : angular.noop;
                    !isNullOrUndefined(data.offer.deliveryAddress.country) ? country = data.offer.deliveryAddress.country : angular.noop;
                    return "<span class='text-ellipses' title='" + zip + " " + city + " " + country + "'>" + zip + " " + city + " " + country + "</span>";
                }),
            this.DTColumnBuilder.newColumn("offer.timestamp").withTitle(
                this.translate("COMMON_DATE")).renderWith(
                function (data, type, full) {
                    return toLocalDate(data, "DD.MM.YYYY HH:mm");
                }).withOption("type", "date-euro")
                .withClass("text-center"),
            this.DTColumnBuilder.newColumn("offer.customer.phone").withTitle(
                this.translate("COMMON_PHONE")).notVisible(),
            this.DTColumnBuilder.newColumn("offer.customer.firstname").withTitle(
                this.translate("COMMON_FIRSTNAME")).notVisible(),
            this.DTColumnBuilder.newColumn("offer.deliveryAddressLine").withTitle(
                this.translate("COMMON_PRODUCT_DESTINATION")).notVisible(),
            this.DTColumnBuilder.newColumn("offer.deliveryDate").withTitle(
                this.translate("COMMON_DELIVERY_TIME")).notVisible(),
            this.DTColumnBuilder.newColumn(null).withTitle(
                this.translate("COMMON_PRODUCT_DELIVERYCOSTS"))
                .renderWith(
                function (data, type, full) {
                    if (isNullOrUndefined(data.offer.deliveryCosts)) {
                        return self.filter("currency")(0, "€", 2);
                    }
                    return self.filter("currency")(data.lead.deliveryCosts,
                        "€", 2);
                }).notVisible(),
            this.DTColumnBuilder.newColumn(null).withTitle(
                this.translate("COMMON_PRODUCT_OFFER_PRICE"))
                .renderWith(
                function (data, type, full) {
                    if (isNullOrUndefined(data.offer.netPrice)) {
                        return self.filter("currency")(0, "€", 2);
                    }
                    return self.filter("currency")(data.offer.netPrice,
                        "€", 2);
                }).notVisible(),
            this.DTColumnBuilder.newColumn(null).withTitle(
                this.translate("COMMON_STATUS")).withClass("text-center")
                .renderWith(addStatusStyle),
            this.DTColumnBuilder.newColumn(null).withTitle(
                "<span class='glyphicon glyphicon-cog'></span>").withClass(
                "text-center").withOption("width", "210px").notSortable().renderWith(addActionsButtons),
            this.DTColumnBuilder.newColumn(null).withTitle(this.translate("COMMON_PROCESSOR")).renderWith(
                function (data: Process, type, full) {
                    if (data != null && data.processor != null) {
                        return data.processor.firstname + " " + data.processor.lastname;
                    } else {
                        return "";
                    }
                }).notVisible(),
            this.DTColumnBuilder.newColumn(null)
                .renderWith(
                function (data, type, full) {
                    return "#id:" + data.id + "#";
                }).notVisible()];
    }

    getActionButtonConfig(process: Process): { [key: string]: ActionButtonConfig } {
        let user = new User();
        let rootScopeUser: User = this.rootScope.user;
        user.id = rootScopeUser.id;
        user.role = Role.SUPERADMIN;

        let config = new ActionButtonConfigBuilder();
        config.get(ActionButtonType.CREATE_NEXT_WORKFLOWUNIT).setVisible().setTitle("OFFER_CREATE_SALE").setIcon("fa fa-usd");
        if (process.status === Status.OFFER || process.status === Status.FOLLOWUP || process.status === Status.DONE) {
            config.get(ActionButtonType.CREATE_NEXT_WORKFLOWUNIT).setEnabled().setIcon("fa fa-usd");
        }
        if (user.role === Role.ADMIN || user.role === Role.SUPERADMIN) {
            config.get(ActionButtonType.PIN_DROPDOWN).setEnabled().setTitle("LEAD_PIN");
            config.get(ActionButtonType.DETAILS_OPEN_DELETE_MODAL).setEnabled().setTitle("OFFER_DELETE_OFFER");
            config.get(ActionButtonType.PIN_DROPDOWN_EMPTY_PROCESSOR).setEnabled();
            config.get(ActionButtonType.DETAILS_OPEN_ROLLBACK_MODAL).setEnabled().setTitle("OFFER_ROLLBACK_TITLE");
        } else {
            config.get(ActionButtonType.PIN_BUTTON).setVisible().setEnabled(isNullOrUndefined(process.processor) || process.processor.id === user.id).setTitle("LEAD_PIN");
            config.get(ActionButtonType.DETAILS_OPEN_DELETE_MODAL).setVisible()
                .setEnabled(isNullOrUndefined(process.processor) || process.processor.id === user.id).setTitle("LEAD_DELETE_LEAD");
            config.get(ActionButtonType.DETAILS_OPEN_ROLLBACK_MODAL).setVisible()
                .setEnabled(isNullOrUndefined(process.processor) || process.processor.id === user.id).setTitle("OFFER_ROLLBACK_TITLE");
            config.get(ActionButtonType.CREATE_NEXT_WORKFLOWUNIT).setEnabled(isNullOrUndefined(process.processor) || process.processor.id === user.id);

        }
        config.get(ActionButtonType.QUICK_MAIL).setEnabled().setTitle("EMAIL_SEND");
        config.get(ActionButtonType.SET_OFFER_DONE).setEnabled().setTitle("COMMON_STATUS_SET_DONE").setIcon("fa fa-check");
        config.get(ActionButtonType.DETAILS_TOGGLE_CLOSE_OR_OPEN).setEnabled().setTitle("OFFER_CLOSE_OFFER").setIcon("fa fa-lock");
        config.get(ActionButtonType.DETAILS_OPEN_EDIT_MODAL).setEnabled().setTitle("OFFER_EDIT_OFFER");
        config.get(ActionButtonType.DETAILS_DROPDOWN).setEnabled().setTitle("COMMON_DETAILS");
        if (!isNullOrUndefined(process.sale)
            || !(user.role === Role.ADMIN || user.role === Role.SUPERADMIN) && (!isNullOrUndefined(process.processor) && process.processor.id !== user.id)) {
            config.disableAll();
        }
        else if (process.status === Status.DONE) {
            config.get(ActionButtonType.SET_OFFER_DONE).setEnabled().setTitle("COMMON_STATUS_SET_OPEN").setIcon("fa fa-undo");
        } else if (process.status === Status.CLOSED) {
            config.disableAll();
            config.get(ActionButtonType.DETAILS_TOGGLE_CLOSE_OR_OPEN).setEnabled().setTitle("OFFER_OPEN_OFFER").setIcon("fa fa-unlock");
            config.get(ActionButtonType.DETAILS_DROPDOWN).setEnabled().setTitle("COMMON_DETAILS");
        }
        return config.build();
    }

    getActionButtonsHTML(process: Process, actionButtonConfig: { [key: number]: any }): string {
        actionButtonConfig[process.id] = this.getActionButtonConfig(process);
        let actionButtons = actionButtonConfig[process.id];
        if (actionButtons.DETAILS_DROPDOWN.disabled === true) {
            let currentStatus = this.translate.instant(process.status);
            return this.translate.instant("COMMON_WORKFLOW_NO_ACTION") + " <a uib-tooltip='" + this.translate.instant("OFFER_NO_ACTION_INFO", { status: currentStatus }) + "' tooltip-class='noActionTooltip' tooltip-placement='top-right'><i class='fa fa-info-circle'></i></a>";
        } else {
            return "<div actionbuttons actionbuttonconfig=offerCtrl.actionButtonConfig[" + process.id + "]  process='offerCtrl.processes[" + process.id + "]'></div>";
        }
    }

    getStatusStyleHTML(data: Process): string {
        if (data.status === "OPEN" || data.status === "OFFER") {
            return "<span style='color: green;'>"
                + this.translate.instant("COMMON_STATUS_OPEN") + "</span>";
        } else if (data.status === "FOLLOWUP") {
            return "<span style='color: #f79d3c;'>"
                + data.followUpAmount + "x " + this.translate.instant("COMMON_STATUS_FOLLOW_UP") + "</span>";
        }
        else if (data.status === "DONE") {
            return "<span style='color: #f79d3c;'>"
                + this.translate.instant("COMMON_STATUS_DONE") + "</span>";
        }
        else if (data.status === "SALE") {
            return "<span style='color: #1872ab;'>"
                + this.translate.instant("COMMON_STATUS_SALE") + "</span>";
        } else if (data.status === "CLOSED") {
            return "<span style='color: #ea394c;'>"
                + this.translate.instant("COMMON_STATUS_CLOSED") + "</span>";
        }
    }

}
angular.module(moduleOfferDataTableService, [ngResourceId]).service(OfferDataTableServiceId, OfferDataTableService);