APP_BUILD_SCRIPT := Android.mk

APP_ABI := armeabi-v7a
APP_PLATFORM := android-9

APP_MK_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

NDK_MODULE_PATH := $(APP_MK_DIR)$(HOST_DIRSEP)$(THIRD_PARTY_NDK_DIR)$(HOST_DIRSEP)$(REACT_COMMON_DIR)$(HOST_DIRSEP)$(APP_MK_DIR)first-party

#APP_STL := gnustl_shared
APP_STL := c++_shared
APP_CFLAGS := -DFOLLY_USE_LIBCPP=1 -DPRIuMAX='"llu"'


# Make sure every shared lib includes a .note.gnu.build-id header
APP_LDFLAGS := -Wl,--build-id
APP_OPTIM=debug

NDK_TOOLCHAIN_VERSION := 4.8

cmd-strip :=