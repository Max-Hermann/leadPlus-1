/// <reference path="../../app/App.Resource.ts" />
/// <reference path="../../User/model/User.Model.ts" />
/// <reference path="../../User/model/Role.Model.ts" />
/// <reference path="../../User/model/Language.Model.ts" />
/// <reference path="../../Setting/model/Setting.Model.ts" />
/// <reference path="../../Setting/controller/Setting.Controller.ts" />
/// <reference path="../../Template/model/Template.Model.ts" />

const SettingServiceId: string = "SettingService";

class SettingService {

    private $inject = [$filterId, toasterId, $translateId, $rootScopeId, SettingResourceId, SmtpResourceId, UserResourceId, FileResourceId, TemplateServiceId, ApiServiceId];

    settingsResource;
    smtpResource;
    userResource;
    fileResource;
    templateResource;

    templateService;
    apiService;

    rootScope;
    translate;
    filter;
    toaster;
    counter;

    roleSelection = Array<any>();
    users: Array<User>;
    templates: Array<Template>;
    apis: Array<Api>;

    constructor($filter, toaster, $translate, $rootScope, SettingResource, SmtpResource, UserResource, FileResource, TemplateService, ApiService) {
        this.filter = $filter;
        this.toaster = toaster;
        this.rootScope = $rootScope;
        this.translate = $translate;
        this.settingsResource = SettingResource.resource;
        this.smtpResource = SmtpResource.resource;
        this.userResource = UserResource.resource;
        this.fileResource = FileResource.resource;

        this.loadUsers();

        this.templateService = TemplateService;
        this.apiService = ApiService;
        this.templateService.getAll();
        this.apiService.getAll();
    }

    loadUsers() {
        let self = this;
        this.settingsResource.getAll().$promise.then(function (result) {
            self.users = result;
        });
    }

    activateUser(user: User) {
        let self = this;
        this.settingsResource.activate({ id: user.id }, true).$promise.then(function (result: User) {
            self.replaceUser(result);
            self.toaster.pop("success", "", self.translate.instant("SETTING_TOAST_ACCESS_GRANTED"));
        }, function () {
            self.toaster.pop("error", "", self.translate.instant("SETTING_TOAST_ACCESS_GRANTED_ERROR"));
        });
    }

    replaceUser(newUser: User) {
        let oldUser: User = findElementById(this.users, newUser.id);
        let index = this.users.indexOf(oldUser);
        this.users[index] = newUser;
    }

    deactivateUser(user: User) {
        let self = this;
        this.settingsResource.activate({ id: user.id }, false).$promise.then(function (result: User) {
            self.replaceUser(result);
            self.toaster.pop("success", "", self.translate.instant("SETTING_TOAST_ACCESS_REVOKED"));
        }, function () {
            self.toaster.pop("error", "", self.translate.instant("SETTING_TOAST_ACCESS_REVOKED_ERROR"));
        });
    }

    changeRole(user: User) {
        let self = this;
        this.settingsResource.changeRole({ id: user.id, role: user.role }).$promise.then(function (result: User) {
            self.replaceUser(result);
            self.toaster.pop("success", "", self.translate.instant("SETTING_TOAST_SET_ROLE"));
        }, function () {
            self.toaster.pop("error", "", self.translate.instant("SETTING_TOAST_SET_ROLE_ERROR"));
        });
    }

    hasRight(user: User): boolean {
        if (user.id === this.rootScope.user.id
            || (user.role === this.rootScope.user.role)
            || this.rootScope.user.role === Role.USER
            || user.role === Role.SUPERADMIN) {
            return true;
        } else {
            return false;
        }
    }

}

angular.module(moduleSettingService, [ngResourceId]).service(SettingServiceId, SettingService);

