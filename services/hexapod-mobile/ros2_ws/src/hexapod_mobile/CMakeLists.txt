cmake_minimum_required(VERSION 3.8)
project(hexapod_mobile)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Find dependencies
find_package(ament_cmake REQUIRED)
find_package(ament_cmake_python REQUIRED)
find_package(rclcpp REQUIRED)
find_package(rclpy REQUIRED)
find_package(std_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(nav_msgs REQUIRED)
find_package(tf2 REQUIRED)
find_package(tf2_ros REQUIRED)
find_package(tf2_geometry_msgs REQUIRED)
find_package(nav2_msgs REQUIRED)
find_package(cv_bridge REQUIRED)
find_package(image_transport REQUIRED)
find_package(hardware_interface REQUIRED)
find_package(controller_interface REQUIRED)
find_package(rosidl_default_generators REQUIRED)

# Generate custom messages and services
rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/HexapodState.msg"
  "msg/LegState.msg"
  "msg/GeologicalFeature.msg"
  "msg/InspectionResult.msg"
  "srv/DeploySensor.srv"
  "srv/StartMission.srv"
  "action/NavigateToGoal.action"
  "action/InspectArea.action"
  DEPENDENCIES std_msgs geometry_msgs sensor_msgs nav_msgs
)

# Include directories
include_directories(include)

# Hexapod hardware interface
add_library(hexapod_hardware_interface SHARED
  src/hardware/hexapod_hardware_interface.cpp
)
target_compile_features(hexapod_hardware_interface PUBLIC c_std_99 cxx_std_17)
target_include_directories(hexapod_hardware_interface PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
)
ament_target_dependencies(hexapod_hardware_interface
  hardware_interface
  rclcpp
  rclcpp_lifecycle
)

# Hexapod controller
add_library(hexapod_controller SHARED
  src/control/hexapod_controller.cpp
)
target_compile_features(hexapod_controller PUBLIC c_std_99 cxx_std_17)
target_include_directories(hexapod_controller PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
)
ament_target_dependencies(hexapod_controller
  controller_interface
  hardware_interface
  rclcpp
  rclcpp_lifecycle
  geometry_msgs
)

# Navigation planner
add_executable(hexapod_navigation_node
  src/navigation/hexapod_navigation_node.cpp
  src/navigation/hexapod_planner.cpp
)
target_compile_features(hexapod_navigation_node PUBLIC c_std_99 cxx_std_17)
target_include_directories(hexapod_navigation_node PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
)
ament_target_dependencies(hexapod_navigation_node
  rclcpp
  nav2_msgs
  nav_msgs
  geometry_msgs
  tf2
  tf2_ros
)

# Computer vision node
add_executable(hexapod_vision_node
  src/vision/hexapod_vision_node.cpp
  src/vision/geological_detector.cpp
)
target_compile_features(hexapod_vision_node PUBLIC c_std_99 cxx_std_17)
target_include_directories(hexapod_vision_node PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
)
ament_target_dependencies(hexapod_vision_node
  rclcpp
  sensor_msgs
  cv_bridge
  image_transport
)

# Mission controller
add_executable(hexapod_mission_node
  src/mission/hexapod_mission_node.cpp
)
target_compile_features(hexapod_mission_node PUBLIC c_std_99 cxx_std_17)
target_include_directories(hexapod_mission_node PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
)
ament_target_dependencies(hexapod_mission_node
  rclcpp
  std_msgs
  geometry_msgs
  nav2_msgs
)

# Install targets
install(TARGETS
  hexapod_hardware_interface
  hexapod_controller
  DESTINATION lib/${PROJECT_NAME}
)

install(TARGETS
  hexapod_navigation_node
  hexapod_vision_node
  hexapod_mission_node
  DESTINATION lib/${PROJECT_NAME}
)

# Install Python modules
ament_python_install_package(${PROJECT_NAME})

# Install Python scripts
install(PROGRAMS
  scripts/hexapod_teleop.py
  scripts/sensor_deployment.py
  scripts/mission_planner.py
  DESTINATION lib/${PROJECT_NAME}
)

# Install launch files
install(DIRECTORY launch
  DESTINATION share/${PROJECT_NAME}/
)

# Install config files
install(DIRECTORY config
  DESTINATION share/${PROJECT_NAME}/
)

# Install URDF and meshes
install(DIRECTORY urdf
  DESTINATION share/${PROJECT_NAME}/
)

install(DIRECTORY meshes
  DESTINATION share/${PROJECT_NAME}/
)

# Install maps and worlds
install(DIRECTORY maps
  DESTINATION share/${PROJECT_NAME}/
)

install(DIRECTORY worlds
  DESTINATION share/${PROJECT_NAME}/
)

# Testing
if(BUILD_TESTING)
  find_package(ament_lint_auto REQUIRED)
  find_package(ament_cmake_gtest REQUIRED)
  
  # Linting
  ament_lint_auto_find_test_dependencies()
  
  # Unit tests
  ament_add_gtest(test_hexapod_controller
    test/test_hexapod_controller.cpp
  )
  target_include_directories(test_hexapod_controller PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
  )
  ament_target_dependencies(test_hexapod_controller
    rclcpp
    geometry_msgs
  )
  
  ament_add_gtest(test_hexapod_planner
    test/test_hexapod_planner.cpp
  )
  target_include_directories(test_hexapod_planner PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
  )
  ament_target_dependencies(test_hexapod_planner
    rclcpp
    nav_msgs
    geometry_msgs
  )
endif()

# Export dependencies
ament_export_targets(hexapod_hardware_interface HAS_LIBRARY_TARGET)
ament_export_targets(hexapod_controller HAS_LIBRARY_TARGET)
ament_export_dependencies(
  hardware_interface
  controller_interface
  rclcpp
  geometry_msgs
  sensor_msgs
  nav_msgs
)

ament_package()