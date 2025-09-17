#!/usr/bin/env python3

import os
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
from ament_index_python.packages import get_package_share_directory

def generate_launch_description():
    # Package directories
    pkg_hexapod_mobile = get_package_share_directory('hexapod_mobile')
    
    # Launch arguments
    use_sim_time = LaunchConfiguration('use_sim_time')
    robot_name = LaunchConfiguration('robot_name')
    use_rviz = LaunchConfiguration('use_rviz')
    use_navigation = LaunchConfiguration('use_navigation')
    use_vision = LaunchConfiguration('use_vision')
    
    declare_use_sim_time_cmd = DeclareLaunchArgument(
        'use_sim_time',
        default_value='false',
        description='Use simulation (Gazebo) clock if true'
    )
    
    declare_robot_name_cmd = DeclareLaunchArgument(
        'robot_name',
        default_value='hexapod_mobile',
        description='Name of the robot'
    )
    
    declare_use_rviz_cmd = DeclareLaunchArgument(
        'use_rviz',
        default_value='true',
        description='Whether to start RViz'
    )
    
    declare_use_navigation_cmd = DeclareLaunchArgument(
        'use_navigation',
        default_value='true',
        description='Whether to start navigation stack'
    )
    
    declare_use_vision_cmd = DeclareLaunchArgument(
        'use_vision',
        default_value='true',
        description='Whether to start computer vision'
    )
    
    # Robot state publisher
    urdf_file = os.path.join(pkg_hexapod_mobile, 'urdf', 'hexapod_mobile.urdf.xacro')
    
    robot_state_publisher_node = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        output='screen',
        parameters=[{
            'use_sim_time': use_sim_time,
            'robot_description': urdf_file
        }]
    )
    
    # Joint state publisher
    joint_state_publisher_node = Node(
        package='joint_state_publisher',
        executable='joint_state_publisher',
        name='joint_state_publisher',
        output='screen',
        parameters=[{'use_sim_time': use_sim_time}]
    )
    
    # Hexapod hardware interface
    hexapod_hardware_node = Node(
        package='hexapod_mobile',
        executable='hexapod_hardware_interface',
        name='hexapod_hardware_interface',
        output='screen',
        parameters=[{
            'use_sim_time': use_sim_time,
            'robot_name': robot_name
        }]
    )
    
    # Hexapod controller
    hexapod_controller_node = Node(
        package='controller_manager',
        executable='spawner',
        arguments=['hexapod_controller'],
        output='screen',
        parameters=[{'use_sim_time': use_sim_time}]
    )
    
    # Navigation stack
    navigation_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('hexapod_mobile'),
                'launch',
                'navigation.launch.py'
            ])
        ]),
        condition=IfCondition(use_navigation),
        launch_arguments={
            'use_sim_time': use_sim_time,
            'robot_name': robot_name
        }.items()
    )
    
    # Computer vision node
    vision_node = Node(
        package='hexapod_mobile',
        executable='hexapod_vision_node',
        name='hexapod_vision_node',
        output='screen',
        condition=IfCondition(use_vision),
        parameters=[{
            'use_sim_time': use_sim_time,
            'robot_name': robot_name
        }]
    )
    
    # Mission controller node
    mission_node = Node(
        package='hexapod_mobile',
        executable='hexapod_mission_node',
        name='hexapod_mission_node',
        output='screen',
        parameters=[{
            'use_sim_time': use_sim_time,
            'robot_name': robot_name
        }]
    )
    
    # RViz
    rviz_config_file = PathJoinSubstitution([
        FindPackageShare('hexapod_mobile'),
        'config',
        'hexapod_mobile.rviz'
    ])
    
    rviz_node = Node(
        package='rviz2',
        executable='rviz2',
        name='rviz2',
        output='screen',
        condition=IfCondition(use_rviz),
        arguments=['-d', rviz_config_file],
        parameters=[{'use_sim_time': use_sim_time}]
    )
    
    # Transform publishers
    base_to_camera_tf = Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_camera_tf',
        arguments=['0.15', '0', '0.1', '0', '0', '0', 'base_link', 'camera_link'],
        parameters=[{'use_sim_time': use_sim_time}]
    )
    
    base_to_lidar_tf = Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_lidar_tf',
        arguments=['0.1', '0', '0.15', '0', '0', '0', 'base_link', 'lidar_link'],
        parameters=[{'use_sim_time': use_sim_time}]
    )
    
    # Create the launch description and populate
    ld = LaunchDescription()
    
    # Add launch arguments
    ld.add_action(declare_use_sim_time_cmd)
    ld.add_action(declare_robot_name_cmd)
    ld.add_action(declare_use_rviz_cmd)
    ld.add_action(declare_use_navigation_cmd)
    ld.add_action(declare_use_vision_cmd)
    
    # Add nodes
    ld.add_action(robot_state_publisher_node)
    ld.add_action(joint_state_publisher_node)
    ld.add_action(hexapod_hardware_node)
    ld.add_action(hexapod_controller_node)
    ld.add_action(navigation_launch)
    ld.add_action(vision_node)
    ld.add_action(mission_node)
    ld.add_action(rviz_node)
    ld.add_action(base_to_camera_tf)
    ld.add_action(base_to_lidar_tf)
    
    return ld